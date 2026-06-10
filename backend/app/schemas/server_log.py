from datetime import datetime

from pydantic import BaseModel, Field


class ServerLogResponse(BaseModel):
    id: int
    project_id: int
    filename: str
    content_type: str | None
    size_bytes: int
    source: str | None
    raw_content: str
    created_at: datetime

    model_config = {
        "from_attributes": True
    }


class ServerLogListItem(BaseModel):
    id: int
    project_id: int
    filename: str
    content_type: str | None
    size_bytes: int
    source: str | None
    created_at: datetime

    model_config = {
        "from_attributes": True
    }


class ServerLogAnalysisReportResponse(BaseModel):
    id: int
    project_id: int
    server_log_id: int

    category: str
    severity: str
    summary: str

    evidence: list[str] = Field(default_factory=list)
    error_groups: list[dict] = Field(default_factory=list)
    suspected_causes: list[str] = Field(default_factory=list)
    recommended_actions: list[str] = Field(default_factory=list)

    analysis_score: int | None = None
    engine_version: str | None = None

    created_at: datetime

    model_config = {
        "from_attributes": True
    }
