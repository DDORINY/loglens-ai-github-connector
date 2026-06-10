from __future__ import annotations

import re
from copy import deepcopy
from typing import Any


SECRET_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (
        re.compile(r"\bgithub_pat_[A-Za-z0-9_]{20,}\b"),
        "[MASKED_GITHUB_PAT]",
    ),
    (
        re.compile(r"\bgh[pousr]_[A-Za-z0-9_]{20,}\b"),
        "[MASKED_GITHUB_TOKEN]",
    ),
    (
        re.compile(r"(Authorization\s*:\s*Bearer\s+)[^\s\"']+", re.IGNORECASE),
        r"\1[MASKED_BEARER_TOKEN]",
    ),
    (
        re.compile(r"(Bearer\s+)[A-Za-z0-9._\-]{20,}", re.IGNORECASE),
        r"\1[MASKED_BEARER_TOKEN]",
    ),
    (
        re.compile(r"\beyJ[A-Za-z0-9_\-]+?\.[A-Za-z0-9_\-]+?\.[A-Za-z0-9_\-]+"),
        "[MASKED_JWT]",
    ),
    (
        re.compile(
            r"\b(OPENAI_API_KEY|GEMINI_API_KEY|ANTHROPIC_API_KEY|GITHUB_TOKEN|JWT_SECRET_KEY|SECRET_KEY|API_KEY)\s*=\s*[^\s\"']+",
            re.IGNORECASE,
        ),
        r"\1=[MASKED_SECRET]",
    ),
    (
        re.compile(
            r"\b(OPENAI_API_KEY|GEMINI_API_KEY|ANTHROPIC_API_KEY|GITHUB_TOKEN|JWT_SECRET_KEY|SECRET_KEY|API_KEY)\s*:\s*[^\s\"']+",
            re.IGNORECASE,
        ),
        r"\1: [MASKED_SECRET]",
    ),
    (
        re.compile(
            r"\b(postgresql|postgres|mysql|mongodb|redis)://[^\s\"']+",
            re.IGNORECASE,
        ),
        "[MASKED_DATABASE_URL]",
    ),
    (
        re.compile(r"\b(password|passwd|pwd)\s*=\s*[^\s\"']+", re.IGNORECASE),
        r"\1=[MASKED_PASSWORD]",
    ),
    (
        re.compile(r"\b(password|passwd|pwd)\s*:\s*[^\s\"']+", re.IGNORECASE),
        r"\1: [MASKED_PASSWORD]",
    ),
    (
        re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
        "[MASKED_AWS_ACCESS_KEY]",
    ),
    (
        re.compile(
            r"-----BEGIN [A-Z ]*PRIVATE KEY-----.*?-----END [A-Z ]*PRIVATE KEY-----",
            re.DOTALL,
        ),
        "[MASKED_PRIVATE_KEY]",
    ),
]


EMAIL_RE = re.compile(
    r"\b([A-Za-z0-9._%+\-])([A-Za-z0-9._%+\-]*)(@[A-Za-z0-9.\-]+\.[A-Za-z]{2,})\b"
)


def mask_email(match: re.Match[str]) -> str:
    first = match.group(1)
    domain = match.group(3)
    return f"{first}***{domain}"


def mask_text(value: Any) -> str:
    text = "" if value is None else str(value)

    for pattern, replacement in SECRET_PATTERNS:
        text = pattern.sub(replacement, text)

    text = EMAIL_RE.sub(mask_email, text)

    return text


def mask_data(value: Any) -> Any:
    if isinstance(value, str):
        return mask_text(value)

    if isinstance(value, list):
        return [mask_data(item) for item in value]

    if isinstance(value, tuple):
        return tuple(mask_data(item) for item in value)

    if isinstance(value, dict):
        return {
            key: mask_data(item)
            for key, item in value.items()
        }

    return value


def mask_logs(logs: dict[str, Any]) -> dict[str, Any]:
    masked = deepcopy(logs)

    if "raw_log" in masked:
        masked["raw_log"] = mask_text(masked.get("raw_log"))

    if "error_lines" in masked:
        masked["error_lines"] = [
            mask_text(line)
            for line in masked.get("error_lines") or []
        ]

    if "files" in masked:
        masked["files"] = mask_data(masked.get("files") or [])

    return masked
