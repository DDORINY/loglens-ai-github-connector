from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.db.base import Base


class CIAnalysisReport(Base):
    __tablename__ = "ci_analysis_reports"

    id = Column(Integer, primary_key=True, index=True)
    repository_id = Column(
        Integer,
        ForeignKey("github_repositories.id"),
        nullable=False,
        index=True,
    )

    github_run_id = Column(BigInteger, nullable=False, index=True)

    category = Column(String(100), nullable=False)
    summary = Column(Text, nullable=False)
    confidence = Column(String(50), nullable=False)

    evidence = Column(JSON, nullable=False, default=list)
    suspected_causes = Column(JSON, nullable=False, default=list)
    recommended_actions = Column(JSON, nullable=False, default=list)

    matched_patterns = Column(JSON, nullable=False, default=list)
    analysis_score = Column(Integer, nullable=True)
    engine_version = Column(String(100), nullable=True)

    issue_title = Column(Text, nullable=False)
    issue_body = Column(Text, nullable=False)

    github_issue_id = Column(BigInteger, nullable=True)
    github_issue_number = Column(Integer, nullable=True)
    github_issue_url = Column(Text, nullable=True)
    github_issue_state = Column(String(50), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    repository = relationship("GithubRepository")

    __table_args__ = (
        UniqueConstraint(
            "repository_id",
            "github_run_id",
            name="uq_ci_analysis_reports_repository_run",
        ),
    )
