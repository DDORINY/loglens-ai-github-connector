from __future__ import annotations

import hashlib
import re
from collections import Counter
from typing import Any

from app.services.secret_masking_service import mask_text


ENGINE_VERSION = "loglens-server-log-engine-v1"

ANSI_ESCAPE_RE = re.compile(r"\x1b\[[0-?]*[ -/]*[@-~]")

SEVERITY_PATTERNS = {
    "critical": re.compile(r"\b(CRITICAL|FATAL|PANIC)\b", re.IGNORECASE),
    "error": re.compile(r"\b(ERROR|Exception|Traceback|Stacktrace|failed)\b", re.IGNORECASE),
    "warning": re.compile(r"\b(WARN|WARNING)\b", re.IGNORECASE),
    "http_5xx": re.compile(
        r"\bHTTP[/ ]?\d(?:\.\d)?[\" ]\s*5\d\d\b|\bstatus[=: ]5\d\d\b|\b5\d\d\b",
        re.IGNORECASE,
    ),
}


def clean_line(line: str) -> str:
    line = mask_text(line)
    line = ANSI_ESCAPE_RE.sub("", line)
    return line.strip()


def normalize_for_fingerprint(line: str) -> str:
    value = line.lower()
    value = re.sub(r"\d{4}-\d{2}-\d{2}[t ][\d:.]+z?", "<timestamp>", value)
    value = re.sub(r"\b\d+\b", "<num>", value)
    value = re.sub(r"0x[a-f0-9]+", "<hex>", value)
    value = re.sub(r"\s+", " ", value)
    return value[:300]


def make_fingerprint(line: str) -> str:
    normalized = normalize_for_fingerprint(line)
    return hashlib.sha1(normalized.encode("utf-8")).hexdigest()[:12]


def detect_line_severity(line: str) -> str | None:
    if SEVERITY_PATTERNS["critical"].search(line):
        return "critical"

    if SEVERITY_PATTERNS["http_5xx"].search(line):
        return "error"

    if SEVERITY_PATTERNS["error"].search(line):
        return "error"

    if SEVERITY_PATTERNS["warning"].search(line):
        return "warning"

    return None


def classify_category(lines: list[str]) -> str:
    joined = "\n".join(lines).lower()

    if any(token in joined for token in ["database", "sqlalchemy", "psycopg", "postgres", "mysql", "deadlock", "connection pool"]):
        return "DATABASE_ERROR"

    if any(token in joined for token in ["connection refused", "timeout", "timed out", "econnrefused", "enotfound"]):
        return "NETWORK_ERROR"

    if any(token in joined for token in ["permission denied", "access denied", "eacces", "forbidden", " 403 "]):
        return "PERMISSION_ERROR"

    if any(token in joined for token in ["unauthorized", "authentication", "jwt", "token", "login failed", " 401 "]):
        return "AUTH_ERROR"

    if re.search(r"\b5\d\d\b", joined):
        return "HTTP_5XX_ERROR"

    if any(token in joined for token in ["exception", "traceback", "stacktrace", "error"]):
        return "APPLICATION_ERROR"

    return "UNKNOWN_LOG_PATTERN"


def determine_overall_severity(counts: Counter[str]) -> str:
    if counts["critical"] > 0:
        return "critical"

    if counts["error"] >= 5:
        return "high"

    if counts["error"] > 0:
        return "medium"

    if counts["warning"] > 0:
        return "low"

    return "info"


def build_summary(category: str, severity: str, error_count: int, warning_count: int) -> str:
    labels = {
        "NETWORK_ERROR": "네트워크 연결 오류가 감지되었습니다.",
        "PERMISSION_ERROR": "권한 문제로 인한 오류가 감지되었습니다.",
        "DATABASE_ERROR": "데이터베이스 관련 오류가 감지되었습니다.",
        "AUTH_ERROR": "인증/토큰 관련 오류가 감지되었습니다.",
        "HTTP_5XX_ERROR": "서버 5xx 응답 오류가 감지되었습니다.",
        "APPLICATION_ERROR": "애플리케이션 실행 오류가 감지되었습니다.",
        "UNKNOWN_LOG_PATTERN": "명확한 유형을 특정하기 어려운 로그 패턴이 감지되었습니다.",
    }

    base = labels.get(category, "서버 로그에서 오류 패턴이 감지되었습니다.")
    return f"{base} 오류 {error_count}건, 경고 {warning_count}건이 확인되었습니다. 전체 심각도는 {severity}입니다."


def build_causes(category: str) -> list[str]:
    common = ["최근 배포, 환경 변수, 설정 변경으로 서버 동작이 달라졌을 수 있습니다."]

    mapping = {
        "NETWORK_ERROR": [
            "대상 서비스가 실행되지 않았거나 포트/호스트 설정이 잘못되었을 수 있습니다.",
            "서비스 시작 순서 또는 health check가 부족할 수 있습니다.",
        ],
        "PERMISSION_ERROR": [
            "실행 계정의 파일/API 접근 권한이 부족할 수 있습니다.",
            "토큰 또는 인증 scope가 올바르지 않을 수 있습니다.",
        ],
        "DATABASE_ERROR": [
            "DB 연결 정보, 마이그레이션, 커넥션 풀 설정에 문제가 있을 수 있습니다.",
            "쿼리 실행 중 제약조건 또는 트랜잭션 문제가 발생했을 수 있습니다.",
        ],
        "AUTH_ERROR": [
            "JWT, 세션, API token 검증 과정에서 오류가 발생했을 수 있습니다.",
            "만료된 토큰 또는 잘못된 인증 헤더가 전달되었을 수 있습니다.",
        ],
        "HTTP_5XX_ERROR": [
            "서버 내부 예외가 HTTP 5xx 응답으로 이어졌을 수 있습니다.",
            "특정 요청 경로에서 예외 처리가 누락되었을 수 있습니다.",
        ],
        "APPLICATION_ERROR": [
            "애플리케이션 코드에서 예외가 발생했을 수 있습니다.",
            "입력 데이터, 환경변수, 외부 의존성 상태가 예상과 다를 수 있습니다.",
        ],
    }

    return mapping.get(category, ["로그만으로는 명확한 원인을 특정하기 어렵습니다."]) + common


def build_actions(category: str) -> list[str]:
    common = [
        "오류 발생 시각 전후의 배포/설정 변경 이력을 확인합니다.",
        "동일 시간대의 GitHub Actions 실패 또는 최근 commit 변경사항과 비교합니다.",
    ]

    mapping = {
        "NETWORK_ERROR": [
            "대상 host와 port가 올바른지 확인합니다.",
            "서비스 health check와 재시도 로직을 확인합니다.",
        ],
        "PERMISSION_ERROR": [
            "실행 계정 권한과 secret/token scope를 확인합니다.",
            "파일 권한 또는 API 접근 정책을 점검합니다.",
        ],
        "DATABASE_ERROR": [
            "DATABASE_URL과 DB 접속 가능 여부를 확인합니다.",
            "최근 마이그레이션과 DB 스키마 상태를 확인합니다.",
        ],
        "AUTH_ERROR": [
            "인증 헤더, JWT 만료 시간, secret key 설정을 확인합니다.",
            "실패 요청의 사용자 권한과 토큰 scope를 확인합니다.",
        ],
        "HTTP_5XX_ERROR": [
            "5xx 응답을 발생시킨 endpoint와 stacktrace를 확인합니다.",
            "예외 처리 및 fallback 응답을 보강합니다.",
        ],
        "APPLICATION_ERROR": [
            "stacktrace의 최초 예외 위치를 확인합니다.",
            "최근 변경된 코드와 입력 데이터 조건을 비교합니다.",
        ],
    }

    return mapping.get(category, ["오류 로그의 최초 발생 지점을 기준으로 원인을 추적합니다."]) + common


def analyze_server_log_content(raw_content: str) -> dict[str, Any]:
    masked_content = mask_text(raw_content)
    lines = [clean_line(line) for line in masked_content.splitlines()]
    lines = [line for line in lines if line]

    selected: list[tuple[str, str]] = []

    for line in lines:
        severity = detect_line_severity(line)
        if severity:
            selected.append((severity, line))

    counts: Counter[str] = Counter(severity for severity, _ in selected)
    error_count = counts["critical"] + counts["error"]
    warning_count = counts["warning"]

    selected_lines = [line for _, line in selected]
    category = classify_category(selected_lines or lines)
    severity = determine_overall_severity(counts)

    group_map: dict[str, dict[str, Any]] = {}

    for line_severity, line in selected:
        key = make_fingerprint(line)

        if key not in group_map:
            group_map[key] = {
                "fingerprint": key,
                "severity": line_severity,
                "message": normalize_for_fingerprint(line),
                "sample_line": line,
                "count": 0,
            }

        group_map[key]["count"] += 1

    error_groups = sorted(
        group_map.values(),
        key=lambda item: (-int(item["count"]), str(item["severity"])),
    )[:20]

    evidence = [item["sample_line"] for item in error_groups[:8]]

    if not evidence:
        evidence = lines[:8]

    score = 20
    score += min(error_count * 8, 50)
    score += min(warning_count * 3, 15)

    if category != "UNKNOWN_LOG_PATTERN":
        score += 15

    analysis_score = min(score, 100)

    return {
        "category": category,
        "severity": severity,
        "summary": build_summary(
            category=category,
            severity=severity,
            error_count=error_count,
            warning_count=warning_count,
        ),
        "evidence": evidence,
        "error_groups": error_groups,
        "suspected_causes": build_causes(category),
        "recommended_actions": build_actions(category),
        "analysis_score": analysis_score,
        "engine_version": ENGINE_VERSION,
    }
