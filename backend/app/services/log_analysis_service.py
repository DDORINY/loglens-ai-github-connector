import re
from typing import Any


ANSI_RE = re.compile(r"\x1b\[[0-9;]*m")
TIMESTAMP_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T[0-9:.]+Z\s+")
GITHUB_META_RE = re.compile(r"^##\[(group|endgroup)\]", re.IGNORECASE)


def clean_line(line: str) -> str:
    line = ANSI_RE.sub("", line)
    line = TIMESTAMP_RE.sub("", line)
    return line.strip()


def is_noise_line(line: str) -> bool:
    if not line:
        return True

    if line.startswith("====="):
        return True

    if GITHUB_META_RE.search(line):
        return True

    if line.startswith("Run echo"):
        return True

    if line.startswith("echo "):
        return True

    return False


def dedupe_lines(lines: list[str]) -> list[str]:
    seen = set()
    result = []

    for line in lines:
        key = line.lower()
        if key in seen:
            continue
        seen.add(key)
        result.append(line)

    return result


def extract_clean_evidence(logs: dict[str, Any], limit: int = 30) -> list[str]:
    raw_error_lines = logs.get("error_lines") or []
    raw_log = logs.get("raw_log") or ""

    source_lines = raw_error_lines if raw_error_lines else raw_log.splitlines()

    evidence = []

    keywords = re.compile(
        r"(error|failed|failure|exception|traceback|fatal|exit code|npm err|pytest|tsc|type error|assertion)",
        re.IGNORECASE,
    )

    for raw_line in source_lines:
        line = clean_line(str(raw_line))

        if is_noise_line(line):
            continue

        if keywords.search(line):
            evidence.append(line)

        if len(evidence) >= limit:
            break

    return dedupe_lines(evidence)


def classify_failure(evidence: list[str]) -> str:
    joined = "\n".join(evidence).lower()

    if "pytest" in joined or "assertion" in joined or "test_" in joined:
        return "TEST_FAILURE"

    if "tsc" in joined or "type error" in joined or "typescript" in joined:
        return "TYPE_CHECK_FAILURE"

    if "npm err" in joined or "yarn" in joined or "pnpm" in joined:
        return "NODE_BUILD_FAILURE"

    if "pip" in joined or "modulenotfounderror" in joined or "importerror" in joined:
        return "PYTHON_DEPENDENCY_FAILURE"

    if "permission denied" in joined or "403" in joined or "unauthorized" in joined:
        return "AUTH_OR_PERMISSION_FAILURE"

    if "exit code" in joined:
        return "COMMAND_EXIT_FAILURE"

    return "UNKNOWN_FAILURE"


def build_summary(category: str) -> str:
    summaries = {
        "TEST_FAILURE": "테스트 실행 중 실패가 감지되었습니다.",
        "TYPE_CHECK_FAILURE": "TypeScript 또는 정적 타입 검사 단계에서 실패가 감지되었습니다.",
        "NODE_BUILD_FAILURE": "Node.js 패키지 설치 또는 빌드 단계에서 실패가 감지되었습니다.",
        "PYTHON_DEPENDENCY_FAILURE": "Python 의존성 또는 import 단계에서 실패가 감지되었습니다.",
        "AUTH_OR_PERMISSION_FAILURE": "인증 또는 권한 문제로 작업이 실패했을 가능성이 있습니다.",
        "COMMAND_EXIT_FAILURE": "명령어가 비정상 종료 코드로 실패했습니다.",
        "UNKNOWN_FAILURE": "명확한 실패 유형을 분류하지 못했습니다.",
    }

    return summaries.get(category, summaries["UNKNOWN_FAILURE"])


def build_suspected_causes(category: str) -> list[str]:
    causes = {
        "TEST_FAILURE": [
            "테스트 케이스의 기대값과 실제 결과가 다를 수 있습니다.",
            "최근 코드 변경으로 기존 테스트가 깨졌을 수 있습니다.",
            "테스트 데이터 또는 환경 설정이 누락되었을 수 있습니다.",
        ],
        "TYPE_CHECK_FAILURE": [
            "타입 정의와 실제 사용 코드가 일치하지 않을 수 있습니다.",
            "컴포넌트 props, API 응답 타입, 함수 반환 타입이 변경되었을 수 있습니다.",
        ],
        "NODE_BUILD_FAILURE": [
            "package-lock 또는 node_modules 의존성 문제가 있을 수 있습니다.",
            "빌드 스크립트 또는 환경변수가 누락되었을 수 있습니다.",
        ],
        "PYTHON_DEPENDENCY_FAILURE": [
            "requirements.txt 의존성이 누락되었을 수 있습니다.",
            "가상환경 또는 Python 버전 차이로 import가 실패했을 수 있습니다.",
        ],
        "AUTH_OR_PERMISSION_FAILURE": [
            "GitHub token, secret, 배포 권한 또는 repository 권한이 부족할 수 있습니다.",
        ],
        "COMMAND_EXIT_FAILURE": [
            "workflow step 안의 명령어가 exit code 1 이상으로 종료되었습니다.",
            "직전 로그의 ERROR 또는 FAILED 라인을 우선 확인해야 합니다.",
        ],
        "UNKNOWN_FAILURE": [
            "로그 내 명확한 키워드가 부족합니다.",
            "실패 step 전체 로그를 추가로 확인해야 합니다.",
        ],
    }

    return causes.get(category, causes["UNKNOWN_FAILURE"])


def build_next_actions(category: str) -> list[str]:
    actions = {
        "TEST_FAILURE": [
            "실패한 테스트 이름을 확인합니다.",
            "로컬에서 동일 테스트를 재실행합니다.",
            "최근 PR 또는 커밋에서 테스트 대상 코드 변경 여부를 확인합니다.",
        ],
        "TYPE_CHECK_FAILURE": [
            "tsc 또는 build 로그에서 첫 번째 type error 위치를 확인합니다.",
            "API 응답 타입과 프론트 타입 정의가 일치하는지 확인합니다.",
        ],
        "NODE_BUILD_FAILURE": [
            "npm install 또는 npm ci를 로컬에서 재실행합니다.",
            "package.json과 lock file 변경 이력을 확인합니다.",
        ],
        "PYTHON_DEPENDENCY_FAILURE": [
            "requirements.txt에 누락된 패키지가 있는지 확인합니다.",
            "CI Python 버전과 로컬 Python 버전을 비교합니다.",
        ],
        "AUTH_OR_PERMISSION_FAILURE": [
            "GitHub Secrets와 PAT 권한을 확인합니다.",
            "workflow permissions 설정을 확인합니다.",
        ],
        "COMMAND_EXIT_FAILURE": [
            "exit code 발생 직전 로그를 확인합니다.",
            "해당 step의 run 명령어를 로컬에서 직접 실행합니다.",
        ],
        "UNKNOWN_FAILURE": [
            "전체 raw_log를 확인합니다.",
            "실패 step 이름과 마지막 100줄 로그를 기준으로 재분석합니다.",
        ],
    }

    return actions.get(category, actions["UNKNOWN_FAILURE"])


def analyze_github_actions_logs(logs: dict[str, Any]) -> dict[str, Any]:
    evidence = extract_clean_evidence(logs)
    category = classify_failure(evidence)

    return {
        "category": category,
        "summary": build_summary(category),
        "confidence": "medium" if evidence else "low",
        "evidence": evidence,
        "suspected_causes": build_suspected_causes(category),
        "recommended_actions": build_next_actions(category),
        "issue_title": f"[CI Failure] {build_summary(category)}",
        "issue_body": "\n".join(
            [
                "## 장애 요약",
                build_summary(category),
                "",
                "## 실패 유형",
                category,
                "",
                "## 근거 로그",
                *[f"- `{line}`" for line in evidence[:10]],
                "",
                "## 원인 후보",
                *[f"- {cause}" for cause in build_suspected_causes(category)],
                "",
                "## 확인 및 조치 항목",
                *[f"- {action}" for action in build_next_actions(category)],
            ]
        ),
    }
