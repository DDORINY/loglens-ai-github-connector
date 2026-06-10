from __future__ import annotations

import re
from typing import Any


def normalize_commit(commit: dict[str, Any]) -> dict[str, Any]:
    commit_data = commit.get("commit") or {}
    author_data = commit_data.get("author") or {}
    github_author = commit.get("author") or {}

    return {
        "sha": commit.get("sha"),
        "message": commit_data.get("message"),
        "author": github_author.get("login") or author_data.get("name"),
        "committed_at": author_data.get("date"),
        "html_url": commit.get("html_url"),
    }


def normalize_pull_request(pr: dict[str, Any]) -> dict[str, Any]:
    return {
        "number": pr.get("number"),
        "title": pr.get("title"),
        "state": pr.get("state"),
        "merged_at": pr.get("merged_at"),
        "html_url": pr.get("html_url"),
    }


def normalize_file(file: dict[str, Any]) -> dict[str, Any]:
    return {
        "filename": file.get("filename"),
        "status": file.get("status"),
        "additions": file.get("additions") or 0,
        "deletions": file.get("deletions") or 0,
        "changes": file.get("changes") or 0,
    }


def extract_keywords_from_logs(logs: dict[str, Any]) -> list[str]:
    text_parts: list[str] = []

    for line in logs.get("error_lines") or []:
        text_parts.append(str(line))

    raw_log = logs.get("raw_log") or ""
    text_parts.append(str(raw_log[:5000]))

    joined = "\n".join(text_parts).lower()

    candidates = re.findall(r"[a-zA-Z0-9_\-./]+", joined)

    stopwords = {
        "the",
        "and",
        "for",
        "with",
        "this",
        "that",
        "error",
        "failed",
        "failure",
        "exit",
        "code",
        "run",
        "echo",
        "true",
        "false",
        "null",
        "undefined",
    }

    keywords: list[str] = []
    seen = set()

    for word in candidates:
        cleaned = word.strip("./-_").lower()

        if len(cleaned) < 4:
            continue

        if cleaned in stopwords:
            continue

        if cleaned in seen:
            continue

        seen.add(cleaned)
        keywords.append(cleaned)

        if len(keywords) >= 40:
            break

    return keywords


def calculate_relevance(
    changed_files: list[dict[str, Any]],
    logs: dict[str, Any],
    workflow_name: str | None = None,
) -> dict[str, Any]:
    score = 0
    reasons: list[str] = []

    filenames = [str(file.get("filename") or "") for file in changed_files]
    filenames_lower = [filename.lower() for filename in filenames]
    joined_files = "\n".join(filenames_lower)

    keywords = extract_keywords_from_logs(logs)

    if any(filename.startswith(".github/workflows/") for filename in filenames_lower):
        score += 35
        reasons.append("GitHub Actions workflow 파일이 변경사항에 포함되어 있습니다.")

    if workflow_name:
        workflow_key = workflow_name.lower().replace(" ", "-")
        if workflow_key and workflow_key in joined_files:
            score += 20
            reasons.append("변경 파일 경로가 실패한 workflow 이름과 연관됩니다.")

    matched_keywords = []

    for keyword in keywords:
        if keyword in joined_files:
            matched_keywords.append(keyword)

    if matched_keywords:
        score += min(30, len(matched_keywords) * 5)
        reasons.append(
            "실패 로그 키워드가 변경 파일 경로와 일부 일치합니다: "
            + ", ".join(matched_keywords[:6])
        )

    if any(
        filename.endswith(("package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock"))
        for filename in filenames_lower
    ):
        score += 15
        reasons.append("의존성 관련 파일 변경이 포함되어 CI 실패와 연관될 수 있습니다.")

    if any(
        filename.endswith(("requirements.txt", "pyproject.toml", "poetry.lock"))
        for filename in filenames_lower
    ):
        score += 15
        reasons.append("Python 의존성 관련 파일 변경이 포함되어 CI 실패와 연관될 수 있습니다.")

    if any(
        filename.endswith(("tsconfig.json", "next.config.ts", "next.config.js"))
        for filename in filenames_lower
    ):
        score += 15
        reasons.append("프론트엔드 빌드/타입 설정 파일 변경이 포함되어 있습니다.")

    if not reasons:
        reasons.append("변경 파일과 실패 로그 사이의 명확한 경로 기반 연관성은 낮습니다.")

    return {
        "score": min(score, 100),
        "reasons": reasons,
        "matched_keywords": matched_keywords[:10],
    }
