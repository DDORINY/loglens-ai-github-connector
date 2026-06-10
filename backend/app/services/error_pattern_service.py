from __future__ import annotations

import re
from typing import Any


ANSI_ESCAPE_RE = re.compile(r"\x1b\[[0-?]*[ -/]*[@-~]")
GITHUB_TIMESTAMP_RE = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\s*"
)


ERROR_PATTERNS: list[dict[str, Any]] = [
    {
        "category": "TEST_FAILURE",
        "summary": "테스트 실행 중 실패가 감지되었습니다.",
        "confidence": "high",
        "patterns": [
            r"\bFAILED\b",
            r"\bpytest\b",
            r"\bAssertionError\b",
            r"\btest_[a-zA-Z0-9_]+",
            r"Tests failed",
        ],
        "causes": [
            "테스트 케이스의 기대값과 실제 결과가 다를 수 있습니다.",
            "최근 코드 변경으로 기존 테스트가 깨졌을 수 있습니다.",
            "CI 환경과 로컬 환경의 테스트 조건이 다를 수 있습니다.",
        ],
        "actions": [
            "실패한 테스트 이름을 확인합니다.",
            "로컬에서 동일 테스트를 재실행합니다.",
            "최근 변경된 테스트 파일과 대상 코드를 비교합니다.",
            "CI 환경 변수와 테스트 데이터 준비 과정을 확인합니다.",
        ],
    },
    {
        "category": "PYTHON_DEPENDENCY_ERROR",
        "summary": "Python 의존성 또는 모듈 import 오류가 감지되었습니다.",
        "confidence": "high",
        "patterns": [
            r"ModuleNotFoundError",
            r"ImportError",
            r"No module named",
            r"pip install",
            r"Could not find a version that satisfies",
        ],
        "causes": [
            "필요한 Python 패키지가 requirements.txt 또는 pyproject.toml에 누락되었을 수 있습니다.",
            "CI 환경의 Python 버전과 로컬 환경이 다를 수 있습니다.",
            "패키지 버전 충돌로 인해 모듈 로딩에 실패했을 수 있습니다.",
        ],
        "actions": [
            "requirements.txt 또는 pyproject.toml에 누락된 패키지가 있는지 확인합니다.",
            "CI에서 사용하는 Python 버전을 확인합니다.",
            "로컬에서 깨끗한 가상환경을 만든 뒤 의존성을 재설치합니다.",
        ],
    },
    {
        "category": "NODE_DEPENDENCY_ERROR",
        "summary": "Node.js 의존성 설치 또는 패키지 오류가 감지되었습니다.",
        "confidence": "high",
        "patterns": [
            r"npm ERR!",
            r"pnpm ERR!",
            r"yarn error",
            r"Cannot find module",
            r"package-lock\.json",
            r"node_modules",
        ],
        "causes": [
            "package.json 또는 lockfile 변경으로 의존성 충돌이 발생했을 수 있습니다.",
            "CI 환경의 Node.js 버전이 프로젝트 요구사항과 다를 수 있습니다.",
            "lockfile이 최신 package.json과 일치하지 않을 수 있습니다.",
        ],
        "actions": [
            "package.json과 lockfile의 변경사항을 확인합니다.",
            "CI에서 사용하는 Node.js 버전을 확인합니다.",
            "로컬에서 node_modules를 삭제한 뒤 재설치해 봅니다.",
            "lockfile이 커밋되었는지 확인합니다.",
        ],
    },
    {
        "category": "TYPESCRIPT_BUILD_ERROR",
        "summary": "TypeScript 또는 Next.js 빌드 오류가 감지되었습니다.",
        "confidence": "high",
        "patterns": [
            r"Type error",
            r"tsc",
            r"TypeScript",
            r"next build",
            r"Failed to compile",
            r"Property .* does not exist",
        ],
        "causes": [
            "타입 정의와 실제 데이터 구조가 일치하지 않을 수 있습니다.",
            "최근 컴포넌트 또는 API 타입 변경으로 빌드가 실패했을 수 있습니다.",
            "tsconfig 또는 Next.js 설정 변경이 영향을 줬을 수 있습니다.",
        ],
        "actions": [
            "빌드 로그에서 최초 TypeScript 오류 위치를 확인합니다.",
            "API 응답 타입과 프론트 타입 정의가 일치하는지 확인합니다.",
            "로컬에서 npm run build를 재실행합니다.",
        ],
    },
    {
        "category": "DOCKER_BUILD_ERROR",
        "summary": "Docker 빌드 또는 이미지 생성 오류가 감지되었습니다.",
        "confidence": "medium",
        "patterns": [
            r"docker build",
            r"Dockerfile",
            r"failed to solve",
            r"Build failed",
            r"no such file or directory",
        ],
        "causes": [
            "Dockerfile에서 참조하는 파일 경로가 잘못되었을 수 있습니다.",
            "빌드 컨텍스트에 필요한 파일이 포함되지 않았을 수 있습니다.",
            "이미지 빌드 중 의존성 설치가 실패했을 수 있습니다.",
        ],
        "actions": [
            "Dockerfile의 COPY 경로를 확인합니다.",
            ".dockerignore에 필요한 파일이 제외되어 있는지 확인합니다.",
            "로컬에서 동일 docker build 명령을 실행해 봅니다.",
        ],
    },
    {
        "category": "PERMISSION_ERROR",
        "summary": "권한 문제로 인한 실패가 감지되었습니다.",
        "confidence": "medium",
        "patterns": [
            r"Permission denied",
            r"Access denied",
            r"EACCES",
            r"not permitted",
            r"403",
        ],
        "causes": [
            "CI 실행 계정에 파일 또는 API 접근 권한이 없을 수 있습니다.",
            "토큰 권한 scope가 부족할 수 있습니다.",
            "실행 파일 권한이 누락되었을 수 있습니다.",
        ],
        "actions": [
            "실패한 파일 또는 API의 권한을 확인합니다.",
            "GitHub token 또는 secret 권한을 확인합니다.",
            "필요하면 chmod 또는 권한 설정 단계를 workflow에 추가합니다.",
        ],
    },
    {
        "category": "NETWORK_ERROR",
        "summary": "네트워크 연결 또는 외부 서비스 접근 오류가 감지되었습니다.",
        "confidence": "medium",
        "patterns": [
            r"Connection refused",
            r"timeout",
            r"Timed out",
            r"ECONNREFUSED",
            r"ENOTFOUND",
            r"Name or service not known",
        ],
        "causes": [
            "CI 환경에서 외부 서비스에 접근하지 못했을 수 있습니다.",
            "서비스 시작 전에 테스트가 먼저 실행되었을 수 있습니다.",
            "네트워크 주소 또는 포트 설정이 잘못되었을 수 있습니다.",
        ],
        "actions": [
            "대상 서비스의 host와 port를 확인합니다.",
            "테스트 전 서비스 health check 단계를 추가합니다.",
            "CI 환경에서 접근 가능한 네트워크인지 확인합니다.",
        ],
    },
]


def clean_log_line(line: str) -> str:
    cleaned = ANSI_ESCAPE_RE.sub("", str(line))
    cleaned = GITHUB_TIMESTAMP_RE.sub("", cleaned)
    cleaned = cleaned.replace("##[error]", "")
    cleaned = cleaned.replace("##[warning]", "")
    cleaned = cleaned.replace("##[group]", "")
    cleaned = cleaned.replace("##[endgroup]", "")
    cleaned = cleaned.strip()

    if cleaned.startswith("Run "):
        cleaned = cleaned[4:].strip()

    echo_match = re.match(r'^echo\s+["\'](.+?)["\']$', cleaned)
    if echo_match:
        cleaned = echo_match.group(1).strip()

    return cleaned


def is_low_value_evidence(line: str) -> bool:
    lowered = line.lower().strip()

    if not lowered:
        return True

    low_value_prefixes = (
        "run ",
        "shell:",
        "env:",
        "complete job",
        "prepare workflow directory",
        "prepare all required actions",
        "getting action download info",
    )

    if lowered.startswith(low_value_prefixes):
        return True

    if lowered in {"echo", "exit 1"}:
        return True

    return False


def evidence_priority(line: str) -> int:
    lowered = line.lower()

    if "##[error]" in lowered:
        return 100
    if "failed:" in lowered:
        return 95
    if "error:" in lowered:
        return 90
    if "assertionerror" in lowered:
        return 88
    if "modulenotfounderror" in lowered or "importerror" in lowered:
        return 88
    if "process completed with exit code" in lowered:
        return 80
    if "failed" in lowered:
        return 70
    if "error" in lowered:
        return 65
    if "exception" in lowered:
        return 60

    return 10


def collect_log_text(logs: dict[str, Any]) -> str:
    parts: list[str] = []

    for line in logs.get("error_lines") or []:
        parts.append(str(line))

    raw_log = logs.get("raw_log") or ""
    parts.append(str(raw_log[:15000]))

    for file in logs.get("files") or []:
        content = file.get("content") if isinstance(file, dict) else None
        if content:
            parts.append(str(content)[:3000])

    return "\n".join(parts)


def detect_error_pattern(logs: dict[str, Any]) -> dict[str, Any]:
    text = collect_log_text(logs)

    best_match: dict[str, Any] | None = None
    best_score = 0
    best_patterns: list[str] = []

    for pattern_def in ERROR_PATTERNS:
        matched: list[str] = []

        for pattern in pattern_def["patterns"]:
            if re.search(pattern, text, flags=re.IGNORECASE):
                matched.append(pattern)

        score = len(matched)

        if score > best_score:
            best_score = score
            best_match = pattern_def
            best_patterns = matched

    if best_match:
        confidence = best_match["confidence"]

        if best_score >= 3:
            confidence = "high"
        elif best_score == 2 and confidence == "medium":
            confidence = "medium"
        elif best_score == 1 and confidence == "high":
            confidence = "medium"

        return {
            "category": best_match["category"],
            "summary": best_match["summary"],
            "confidence": confidence,
            "matched_patterns": best_patterns,
            "base_causes": best_match["causes"],
            "base_actions": best_match["actions"],
        }

    return {
        "category": "UNKNOWN_FAILURE",
        "summary": "명확한 실패 유형을 분류하지 못했습니다.",
        "confidence": "low",
        "matched_patterns": [],
        "base_causes": [
            "로그에 명확한 분류 패턴이 부족합니다.",
            "실패 원인이 여러 단계에 분산되어 있을 수 있습니다.",
        ],
        "base_actions": [
            "로그의 최초 error 위치를 확인합니다.",
            "실패 직전 실행된 명령어를 확인합니다.",
            "최근 변경사항과 실패 시점을 비교합니다.",
        ],
    }


def extract_evidence(logs: dict[str, Any], limit: int = 8) -> list[str]:
    candidates: list[tuple[int, int, str]] = []
    seen = set()
    order = 0

    source_lines: list[str] = []

    for line in logs.get("error_lines") or []:
        source_lines.append(str(line))

    raw_log = logs.get("raw_log") or ""
    source_lines.extend(str(raw_log).splitlines())

    for line in source_lines:
        cleaned = clean_log_line(line)

        if is_low_value_evidence(cleaned):
            continue

        priority = evidence_priority(cleaned)

        if priority < 60:
            continue

        normalized = cleaned.lower()

        if normalized in seen:
            continue

        seen.add(normalized)
        candidates.append((priority, order, cleaned))
        order += 1

    candidates.sort(key=lambda item: (-item[0], item[1]))

    evidence = [item[2] for item in candidates[:limit]]

    if evidence:
        return evidence

    fallback: list[str] = []

    for line in source_lines:
        cleaned = clean_log_line(line)

        if is_low_value_evidence(cleaned):
            continue

        normalized = cleaned.lower()

        if normalized in seen:
            continue

        seen.add(normalized)
        fallback.append(cleaned)

        if len(fallback) >= limit:
            break

    return fallback
