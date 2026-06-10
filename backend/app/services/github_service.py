from __future__ import annotations

import io
import re
import zipfile
from typing import Any

import requests
from fastapi import HTTPException, status


GITHUB_API_BASE = "https://api.github.com"


def build_headers(token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def handle_github_error(response: requests.Response) -> None:
    if response.status_code == 401:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="GitHub 인증에 실패했습니다. Personal Access Token을 확인하세요.",
        )

    if response.status_code == 403:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"GitHub API 권한이 부족하거나 rate limit에 도달했습니다: {response.text}",
        )

    if response.status_code == 404:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="GitHub 리소스를 찾을 수 없거나 접근 권한이 없습니다.",
        )

    if response.status_code >= 400:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"GitHub API 요청 실패: {response.status_code} {response.text}",
        )


def get_repository(owner: str, repo: str, token: str) -> dict[str, Any]:
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}"
    response = requests.get(url, headers=build_headers(token), timeout=15)
    handle_github_error(response)
    return response.json()


def list_workflow_runs(
    owner: str,
    repo: str,
    token: str,
    status_value: str | None = "completed",
    conclusion: str | None = None,
    per_page: int = 20,
) -> list[dict[str, Any]]:
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/actions/runs"

    params: dict[str, Any] = {
        "per_page": per_page,
    }

    if status_value:
        params["status"] = status_value

    response = requests.get(
        url,
        headers=build_headers(token),
        params=params,
        timeout=20,
    )

    handle_github_error(response)

    runs = response.json().get("workflow_runs", [])

    if conclusion:
        runs = [run for run in runs if run.get("conclusion") == conclusion]

    return [
        {
            "github_run_id": run.get("id"),
            "workflow_name": run.get("name"),
            "status": run.get("status"),
            "conclusion": run.get("conclusion"),
            "event": run.get("event"),
            "head_branch": run.get("head_branch"),
            "head_sha": run.get("head_sha"),
            "run_number": run.get("run_number"),
            "run_attempt": run.get("run_attempt"),
            "created_at": run.get("created_at"),
            "updated_at": run.get("updated_at"),
            "html_url": run.get("html_url"),
        }
        for run in runs
    ]


def download_workflow_run_logs(
    owner: str,
    repo: str,
    token: str,
    run_id: int,
) -> dict[str, Any]:
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/actions/runs/{run_id}/logs"

    response = requests.get(
        url,
        headers=build_headers(token),
        timeout=30,
        allow_redirects=True,
    )

    handle_github_error(response)

    content_type = response.headers.get("content-type", "")

    if "zip" not in content_type and not response.content.startswith(b"PK"):
        text = response.text[:3000]
        return {
            "run_id": run_id,
            "raw_log": text,
            "error_lines": extract_error_lines(text),
            "files": [],
        }

    log_files: list[dict[str, str]] = []
    merged_text_parts: list[str] = []

    with zipfile.ZipFile(io.BytesIO(response.content)) as zip_file:
        for file_name in zip_file.namelist():
            if file_name.endswith("/"):
                continue

            raw_bytes = zip_file.read(file_name)
            text = raw_bytes.decode("utf-8", errors="replace")

            log_files.append(
                {
                    "file_name": file_name,
                    "content": text[:5000],
                }
            )

            merged_text_parts.append(f"\n\n===== {file_name} =====\n{text}")

    raw_log = "\n".join(merged_text_parts)

    return {
        "run_id": run_id,
        "raw_log": raw_log[:20000],
        "error_lines": extract_error_lines(raw_log),
        "files": log_files[:20],
    }


def extract_error_lines(log_text: str, limit: int = 80) -> list[str]:
    keywords = re.compile(
        r"(error|failed|failure|exception|traceback|fatal|exit code|npm ERR|pytest|tsc)",
        re.IGNORECASE,
    )

    lines = []

    for line in log_text.splitlines():
        cleaned = line.strip()
        if not cleaned:
            continue

        if keywords.search(cleaned):
            lines.append(cleaned)

        if len(lines) >= limit:
            break

    return lines


def create_github_issue(
    owner: str,
    repo: str,
    token: str,
    title: str,
    body: str,
    labels: list[str] | None = None,
) -> dict[str, Any]:
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/issues"

    payload: dict[str, Any] = {
        "title": title,
        "body": body,
    }

    if labels:
        payload["labels"] = labels

    response = requests.post(
        url,
        headers=build_headers(token),
        json=payload,
        timeout=20,
    )

    handle_github_error(response)

    issue = response.json()

    return {
        "github_issue_id": issue.get("id"),
        "number": issue.get("number"),
        "title": issue.get("title"),
        "state": issue.get("state"),
        "html_url": issue.get("html_url"),
        "created_at": issue.get("created_at"),
    }


def get_workflow_run(
    owner: str,
    repo: str,
    token: str,
    run_id: int,
) -> dict[str, Any]:
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/actions/runs/{run_id}"

    response = requests.get(
        url,
        headers=build_headers(token),
        timeout=20,
    )

    handle_github_error(response)
    return response.json()


def get_commit(
    owner: str,
    repo: str,
    token: str,
    sha: str,
) -> dict[str, Any]:
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/commits/{sha}"

    response = requests.get(
        url,
        headers=build_headers(token),
        timeout=20,
    )

    handle_github_error(response)
    return response.json()


def list_pull_requests_for_commit(
    owner: str,
    repo: str,
    token: str,
    sha: str,
) -> list[dict[str, Any]]:
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/commits/{sha}/pulls"

    headers = build_headers(token)
    headers["Accept"] = "application/vnd.github.groot-preview+json"

    response = requests.get(
        url,
        headers=headers,
        timeout=20,
    )

    handle_github_error(response)
    return response.json()


def list_pull_request_files(
    owner: str,
    repo: str,
    token: str,
    pull_number: int,
) -> list[dict[str, Any]]:
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/pulls/{pull_number}/files"

    response = requests.get(
        url,
        headers=build_headers(token),
        timeout=20,
        params={"per_page": 100},
    )

    handle_github_error(response)
    return response.json()
