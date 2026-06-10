from datetime import datetime

from pydantic import BaseModel, Field


class CIAnalysisReportResponse(BaseModel):
    id: int
    repository_id: int
    github_run_id: int

    category: str
    summary: str
    confidence: str

    evidence: list[str]
    suspected_causes: list[str]
    recommended_actions: list[str]

    matched_patterns: list[str] = Field(default_factory=list)
    analysis_score: int | None = None
    engine_version: str | None = None

    issue_title: str
    issue_body: str

    github_issue_id: int | None
    github_issue_number: int | None
    github_issue_url: str | None
    github_issue_state: str | None

    created_at: datetime

    model_config = {
        "from_attributes": True
    }
