from __future__ import annotations

from typing import Any


def infer_contextual_causes(
    pattern_result: dict[str, Any],
    logs: dict[str, Any],
) -> list[str]:
    causes: list[str] = list(pattern_result.get("base_causes") or [])

    raw_log = str(logs.get("raw_log") or "").lower()
    error_lines = "\n".join(str(line) for line in logs.get("error_lines") or []).lower()
    joined = raw_log + "\n" + error_lines

    category = pattern_result.get("category")

    if category == "TEST_FAILURE":
        if "assert" in joined:
            causes.append("Assertion 실패가 포함되어 있어 기대값 검증 로직이 깨졌을 가능성이 있습니다.")
        if "fixture" in joined:
            causes.append("테스트 fixture 또는 테스트 데이터 준비 과정에서 문제가 발생했을 수 있습니다.")
        if "pytest" in joined:
            causes.append("pytest 실행 단계에서 특정 테스트 케이스가 실패한 것으로 보입니다.")

    if category == "PYTHON_DEPENDENCY_ERROR":
        if "no module named" in joined:
            causes.append("CI 환경에 필요한 Python 모듈이 설치되지 않은 상태입니다.")
        if "version" in joined:
            causes.append("Python 패키지 버전 조건이 충돌했을 가능성이 있습니다.")

    if category == "NODE_DEPENDENCY_ERROR":
        if "lockfile" in joined or "package-lock" in joined:
            causes.append("lockfile과 package.json 사이의 불일치가 있을 수 있습니다.")
        if "cannot find module" in joined:
            causes.append("런타임 또는 빌드 단계에서 필요한 Node 모듈을 찾지 못했습니다.")

    if category == "TYPESCRIPT_BUILD_ERROR":
        if "property" in joined and "does not exist" in joined:
            causes.append("객체 타입 정의에 없는 속성을 참조하고 있을 가능성이 있습니다.")
        if "type" in joined:
            causes.append("최근 타입 정의 변경 또는 API 응답 구조 변경이 빌드 실패로 이어졌을 수 있습니다.")

    return dedupe(causes)


def infer_recommended_actions(
    pattern_result: dict[str, Any],
    logs: dict[str, Any],
) -> list[str]:
    actions: list[str] = list(pattern_result.get("base_actions") or [])

    category = pattern_result.get("category")

    if category in {"TEST_FAILURE", "TYPESCRIPT_BUILD_ERROR"}:
        actions.append("실패한 workflow의 head_sha 기준 최근 변경 파일을 확인합니다.")

    if category in {"PYTHON_DEPENDENCY_ERROR", "NODE_DEPENDENCY_ERROR"}:
        actions.append("CI 환경에서 의존성 설치 로그를 확인하고 lockfile 변경 여부를 검토합니다.")

    actions.append("GitHub Actions run의 실패 지점과 최근 commit/PR 변경사항을 함께 비교합니다.")

    return dedupe(actions)


def calculate_analysis_score(
    pattern_result: dict[str, Any],
    evidence: list[str],
) -> int:
    score = 20

    confidence = pattern_result.get("confidence")

    if confidence == "high":
        score += 45
    elif confidence == "medium":
        score += 30
    else:
        score += 10

    matched_patterns = pattern_result.get("matched_patterns") or []
    score += min(len(matched_patterns) * 7, 25)

    if evidence:
        score += min(len(evidence) * 2, 10)

    return min(score, 100)


def dedupe(values: list[str]) -> list[str]:
    result: list[str] = []
    seen = set()

    for value in values:
        normalized = value.strip()

        if not normalized:
            continue

        if normalized in seen:
            continue

        seen.add(normalized)
        result.append(normalized)

    return result
