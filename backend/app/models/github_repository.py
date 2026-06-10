from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base


class GithubRepository(Base):
    __tablename__ = "github_repositories"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)

    owner = Column(String(255), nullable=False)
    repo = Column(String(255), nullable=False)
    default_branch = Column(String(255), nullable=True)

    token_encrypted = Column(Text, nullable=False)
    connected_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    project = relationship("Project")
