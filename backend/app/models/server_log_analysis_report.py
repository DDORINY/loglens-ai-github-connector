from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base


class ServerLogAnalysisReport(Base):
    __tablename__ = "server_log_analysis_reports"

    id = Column(Integer, primary_key=True, index=True)

    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    server_log_id = Column(Integer, ForeignKey("server_logs.id"), nullable=False, index=True)

    category = Column(String(100), nullable=False)
    severity = Column(String(50), nullable=False)
    summary = Column(Text, nullable=False)

    evidence = Column(JSON, nullable=False, default=list)
    error_groups = Column(JSON, nullable=False, default=list)
    suspected_causes = Column(JSON, nullable=False, default=list)
    recommended_actions = Column(JSON, nullable=False, default=list)

    analysis_score = Column(Integer, nullable=True)
    engine_version = Column(String(100), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    project = relationship("Project")
    server_log = relationship("ServerLog")
