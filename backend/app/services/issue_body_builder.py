from __future__ import annotations

from typing import Any


def build_issue_body(
    *,
    category: str,
    summary: str,
    confidence: str,
    evidence: list[str],
    suspected_causes: list[str],
    recommended_actions: list[str],
    matched_patterns: list[str] | None = None,
    analysis_score: int | None = None,
) -> str:
    lines: list[str] = []

    lines.append("## 장애 요약")
    lines.append("")
    lines.append(summary)
    lines.append("")

    lines.append("## 실패 유형")
    lines.append("")
    lines.append(f"- Category: `{category}`")
    lines.append(f"- Confidence: `{confidence}`")

    if analysis_score is not None:
        lines.append(f"- Analysis Score: `{analysis_score} / 100`")

    lines.append("")

    if matched_patterns:
        lines.append("## 감지된 패턴")
        lines.append("")
        for pattern in matched_patterns:
            lines.append(f"- `{pattern}`")
        lines.append("")

    lines.append("## 근거 로그")
    lines.append("")

    if evidence:
        for item in evidence:
            lines.append(f"- {item}")
    else:
        lines.append("- 근거 로그를 추출하지 못했습니다.")

    lines.append("")

    lines.append("## 원인 후보")
    lines.append("")

    for cause in suspected_causes:
        lines.append(f"- {cause}")

    lines.append("")

    lines.append("## 추천 조치")
    lines.append("")

    for action in recommended_actions:
        lines.append(f"- {action}")

    return "\n".join(lines)
