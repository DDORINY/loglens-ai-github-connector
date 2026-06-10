from __future__ import annotations

from typing import Any

from app.services.cause_inference_service import (
    calculate_analysis_score,
    infer_contextual_causes,
    infer_recommended_actions,
)
from app.services.error_pattern_service import detect_error_pattern, extract_evidence
from app.services.issue_body_builder import build_issue_body


def analyze_github_actions_logs(logs: dict[str, Any]) -> dict[str, Any]:
    pattern_result = detect_error_pattern(logs)
    evidence = extract_evidence(logs)

    suspected_causes = infer_contextual_causes(
        pattern_result=pattern_result,
        logs=logs,
    )

    recommended_actions = infer_recommended_actions(
        pattern_result=pattern_result,
        logs=logs,
    )

    analysis_score = calculate_analysis_score(
        pattern_result=pattern_result,
        evidence=evidence,
    )

    category = pattern_result["category"]
    summary = pattern_result["summary"]
    confidence = pattern_result["confidence"]
    matched_patterns = pattern_result.get("matched_patterns") or []

    issue_title = f"[CI Failure] {summary}"

    issue_body = build_issue_body(
        category=category,
        summary=summary,
        confidence=confidence,
        evidence=evidence,
        suspected_causes=suspected_causes,
        recommended_actions=recommended_actions,
        matched_patterns=matched_patterns,
        analysis_score=analysis_score,
    )

    return {
        "category": category,
        "summary": summary,
        "confidence": confidence,
        "evidence": evidence,
        "suspected_causes": suspected_causes,
        "recommended_actions": recommended_actions,
        "issue_title": issue_title,
        "issue_body": issue_body,
        "matched_patterns": matched_patterns,
        "analysis_score": analysis_score,
        "engine_version": "loglens-analysis-engine-v2",
    }
