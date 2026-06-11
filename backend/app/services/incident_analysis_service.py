import re

from app.models.ci_analysis_report import CIAnalysisReport
from app.models.server_log_analysis_report import ServerLogAnalysisReport


ENGINE_VERSION = "loglens-incident-engine-v1"

CI_TEST_FAILURE = "TEST_FAILURE"
CI_TYPESCRIPT_BUILD_ERROR = "TYPESCRIPT_BUILD_ERROR"
CI_DOCKER_BUILD_ERROR = "DOCKER_BUILD_ERROR"
CI_PYTHON_DEPENDENCY_ERROR = "PYTHON_DEPENDENCY_ERROR"
CI_NODE_DEPENDENCY_ERROR = "NODE_DEPENDENCY_ERROR"

CI_BUILD_CATEGORIES = {
    CI_TYPESCRIPT_BUILD_ERROR,
    CI_DOCKER_BUILD_ERROR,
}

CI_DEPENDENCY_CATEGORIES = {
    CI_PYTHON_DEPENDENCY_ERROR,
    CI_NODE_DEPENDENCY_ERROR,
}

CI_FAILURE_CATEGORIES = {
    CI_TEST_FAILURE,
    CI_TYPESCRIPT_BUILD_ERROR,
    CI_DOCKER_BUILD_ERROR,
    CI_PYTHON_DEPENDENCY_ERROR,
    CI_NODE_DEPENDENCY_ERROR,
}

LOG_DATABASE_ERROR = "DATABASE_ERROR"
LOG_NETWORK_ERROR = "NETWORK_ERROR"
LOG_HTTP_5XX_ERROR = "HTTP_5XX_ERROR"
LOG_AUTH_ERROR = "AUTH_ERROR"
LOG_PERMISSION_ERROR = "PERMISSION_ERROR"
LOG_APPLICATION_ERROR = "APPLICATION_ERROR"
LOG_UNKNOWN = "UNKNOWN_LOG_PATTERN"

SEVERITY_RANK = {
    "low": 1,
    "medium": 2,
    "high": 3,
    "critical": 4,
}


def _normalize_category(value: str | None) -> str:
    return (value or "UNKNOWN").strip().upper()


def _normalize_text(value) -> str:
    text = str(value or "")

    replacements = {
        "유형이감지": "유형이 감지",
        "연결오류": "연결 오류",
        "전체심각도": "전체 심각도",
        "동일증상이": "동일 증상이",
        "health check를추가": "health check를 추가",
        "통합장애": "통합 장애",
        "두분석": "두 분석",
        "CI요약": "CI 요약",
        "exitcode": "exit code",
        "Traceback:psycopg2": "Traceback: psycopg2",
        "GET/api": "GET /api",
        "서비스기동": "서비스 기동",
        "실패가서비스": "실패가 서비스",
        "연결될가능성이": "연결될 가능성이",
        "오류가같은": "오류가 같은",
        "코드변경": "코드 변경",
        "또는최근": "또는 최근",
        "category의연관성": "category의 연관성",
        "사이의연관성": "사이의 연관성",
        "1건,경고": "1건, 경고",
        "기동,포트": "기동, 포트",
        "의연관성": "의 연관성",
        "의연관성을": "의 연관성을",
        "로그category": "로그 category",
        "로그오류": "로그 오류",
        "결과가다를": "결과가 다를",
        "health check가부족": "health check가 부족",
        "변경으로서버": "변경으로 서버",
        "로직을확인": "로직을 확인",
        "변경이력을": "변경 이력을",
    }

    for old, new in replacements.items():
        text = text.replace(old, new)

    # TEST_FAILURE유형, NETWORK_ERROR유형 같은 category+한글 붙음 보정
    text = re.sub(r"([A-Z0-9_]+)유형", r"\1 유형", text)

    return text


def _as_list(value) -> list:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [str(value)]


def _unique(items: list) -> list[str]:
    seen = set()
    result = []

    for item in items:
        text = _normalize_text(item).strip()
        if not text or text in seen:
            continue

        seen.add(text)
        result.append(text)

    return result


def _score(value) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def _calculate_match_score(
    ci_category: str,
    log_category: str,
    ci_evidence: list,
    log_evidence: list,
) -> tuple[int, list[str]]:
    ci_category = _normalize_category(ci_category)
    log_category = _normalize_category(log_category)

    evidence_text = " ".join(
        str(item) for item in ci_evidence + log_evidence
    ).lower()

    score = 0
    reasons: list[str] = []

    if log_category == LOG_DATABASE_ERROR and (
        ci_category in {CI_TEST_FAILURE, *CI_BUILD_CATEGORIES}
        or any(
            keyword in evidence_text
            for keyword in ["database", "db", "postgres", "sqlalchemy", "psycopg"]
        )
    ):
        score += 80
        reasons.append("서버 로그의 DB 오류와 CI 실패가 DB/테스트 환경 문제로 연결될 가능성이 있습니다.")

    if log_category == LOG_AUTH_ERROR and any(
        keyword in evidence_text
        for keyword in ["auth", "token", "jwt", "401"]
    ):
        score += 75
        reasons.append("서버 로그의 인증 오류와 CI 로그의 인증/토큰 관련 단서가 연결될 가능성이 있습니다.")

    if log_category == LOG_HTTP_5XX_ERROR and (
        ci_category in CI_FAILURE_CATEGORIES
        or any(
            keyword in evidence_text
            for keyword in ["500", "api", "route", "server", "endpoint"]
        )
    ):
        score += 70
        reasons.append("서버 로그의 5xx 오류와 CI 실패가 API 런타임 오류로 연결될 가능성이 있습니다.")

    if log_category == LOG_NETWORK_ERROR and any(
        keyword in evidence_text
        for keyword in ["connection refused", "timeout", "health", "port"]
    ):
        score += 70
        reasons.append("네트워크/연결 오류와 CI 실패가 서비스 기동, 포트, health check 문제로 연결될 가능성이 있습니다.")

    if ci_category in CI_DEPENDENCY_CATEGORIES and any(
        keyword in evidence_text
        for keyword in [
            "package.json",
            "requirements.txt",
            "pyproject.toml",
            "dependency",
            "install",
            "npm",
            "pip",
            "poetry",
        ]
    ):
        score += 65
        reasons.append("의존성 설치 실패와 변경 파일 또는 로그 단서가 연결될 가능성이 있습니다.")

    if not reasons:
        score = 20
        reasons.append("GitHub Actions 실패와 서버 로그 사이의 명확한 category 기반 연관성은 낮습니다.")

    return min(score, 100), reasons


def _calculate_integrated_score(
    ci_score: int,
    log_score: int,
    match_score: int,
) -> int:
    return min(
        100,
        round((ci_score * 0.35) + (log_score * 0.45) + (match_score * 0.20)),
    )


def _severity_from_score(score: int) -> str:
    if score >= 85:
        return "critical"
    if score >= 70:
        return "high"
    if score >= 40:
        return "medium"
    return "low"


def _calculate_severity(log_severity: str | None, integrated_score: int) -> str:
    log_severity = (log_severity or "low").strip().lower()
    score_severity = _severity_from_score(integrated_score)

    if log_severity not in SEVERITY_RANK:
        return score_severity

    if SEVERITY_RANK[score_severity] > SEVERITY_RANK[log_severity]:
        return score_severity

    return log_severity


def _build_title(ci_category: str, log_category: str, severity: str) -> str:
    return f"[INCIDENT] {log_category}와 {ci_category} 연관 가능성 ({severity})"


def _build_summary(
    ci_report: CIAnalysisReport,
    server_report: ServerLogAnalysisReport,
    match_score: int,
) -> str:
    if match_score >= 70:
        relation_text = "두 분석 결과 사이의 연관성이 비교적 높습니다."
    elif match_score >= 40:
        relation_text = "두 분석 결과 사이에 일부 연관 가능성이 있습니다."
    else:
        relation_text = "두 분석 결과 사이의 직접적인 연관성은 낮지만 함께 검토할 필요가 있습니다."

    summary = (
        f"GitHub Actions 분석에서는 {ci_report.category} 유형이 감지되었고, "
        f"서버 로그 분석에서는 {server_report.category} 유형이 감지되었습니다. "
        f"{relation_text} "
        f"CI 요약: {ci_report.summary} "
        f"서버 로그 요약: {server_report.summary}"
    )

    return _normalize_text(summary)


def build_incident_analysis(
    ci_report: CIAnalysisReport,
    server_report: ServerLogAnalysisReport,
) -> dict:
    ci_category = _normalize_category(ci_report.category)
    log_category = _normalize_category(server_report.category)

    ci_evidence = _as_list(ci_report.evidence)
    server_evidence = _as_list(server_report.evidence)

    match_score, match_reasons = _calculate_match_score(
        ci_category=ci_category,
        log_category=log_category,
        ci_evidence=ci_evidence,
        log_evidence=server_evidence,
    )

    integrated_score = _calculate_integrated_score(
        ci_score=_score(ci_report.analysis_score),
        log_score=_score(server_report.analysis_score),
        match_score=match_score,
    )

    severity = _calculate_severity(
        log_severity=server_report.severity,
        integrated_score=integrated_score,
    )

    combined_evidence = _unique(
        match_reasons
        + ci_evidence
        + server_evidence
    )

    root_cause_candidates = _unique(
        _as_list(ci_report.suspected_causes)
        + _as_list(server_report.suspected_causes)
        + [
            "GitHub Actions 실패와 서버 로그 오류가 같은 변경사항 또는 설정 문제에서 파생되었을 가능성을 확인해야 합니다.",
            "장애 원인은 확정하지 않고, CI 로그·서버 로그·최근 변경사항을 함께 검증해야 합니다.",
        ]
    )

    recommended_actions = _unique(
        _as_list(ci_report.recommended_actions)
        + _as_list(server_report.recommended_actions)
        + [
            "GitHub Actions 실패 시점과 서버 로그 오류 발생 시점을 비교하세요.",
            "관련 commit/PR의 변경 파일과 서버 로그 category의 연관성을 확인하세요.",
            "동일 증상이 재발하지 않도록 테스트 또는 health check를 추가하세요.",
        ]
    )

    return {
        "title": _build_title(
            ci_category=ci_category,
            log_category=log_category,
            severity=severity,
        ),
        "severity": severity,
        "summary": _build_summary(
            ci_report=ci_report,
            server_report=server_report,
            match_score=match_score,
        ),
        "combined_evidence": combined_evidence,
        "root_cause_candidates": root_cause_candidates,
        "recommended_actions": recommended_actions,
        "analysis_score": integrated_score,
        "engine_version": ENGINE_VERSION,
    }
