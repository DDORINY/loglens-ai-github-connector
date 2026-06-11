from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.db.base import Base


class IncidentReport(Base):
    __tablename__ = "incident_reports"

    __table_args__ = (
        UniqueConstraint(
            "project_id",
            "github_analysis_report_id",
            "server_log_analysis_report_id",
            name="uq_incident_reports_project_ci_server_log",
        ),
    )

    id = Column(Integer, primary_key=True)

    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    github_analysis_report_id = Column(
        Integer,
        ForeignKey("ci_analysis_reports.id"),
        nullable=False,
        index=True,
    )
    server_log_analysis_report_id = Column(
        Integer,
        ForeignKey("server_log_analysis_reports.id"),
        nullable=False,
        index=True,
    )

    status = Column(String(50), nullable=False, default="OPEN")
    title = Column(Text, nullable=False)
    severity = Column(String(50), nullable=False)
    summary = Column(Text, nullable=False)

    combined_evidence = Column(JSONB, nullable=False, default=list)
    root_cause_candidates = Column(JSONB, nullable=False, default=list)
    recommended_actions = Column(JSONB, nullable=False, default=list)

    analysis_score = Column(Integer, nullable=True)
    engine_version = Column(String(100), nullable=False, default="loglens-incident-engine-v1")

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    project = relationship("Project")
    github_analysis_report = relationship("CIAnalysisReport")
    server_log_analysis_report = relationship("ServerLogAnalysisReport")
