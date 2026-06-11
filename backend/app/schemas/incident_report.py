from datetime import datetime

from pydantic import BaseModel, Field


class IncidentReportCreate(BaseModel):
    project_id: int
    github_analysis_report_id: int
    server_log_analysis_report_id: int


class IncidentReportResponse(BaseModel):
    id: int
    project_id: int
    github_analysis_report_id: int
    server_log_analysis_report_id: int

    status: str
    title: str
    severity: str
    summary: str

    combined_evidence: list[str] = Field(default_factory=list)
    root_cause_candidates: list[str] = Field(default_factory=list)
    recommended_actions: list[str] = Field(default_factory=list)

    analysis_score: int | None = None
    engine_version: str

    created_at: datetime

    model_config = {
        "from_attributes": True
    }
