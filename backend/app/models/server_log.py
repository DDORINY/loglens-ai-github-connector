from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base


class ServerLog(Base):
    __tablename__ = "server_logs"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)

    filename = Column(String(255), nullable=False)
    content_type = Column(String(100), nullable=True)
    size_bytes = Column(Integer, nullable=False, default=0)
    source = Column(String(100), nullable=True)

    raw_content = Column(Text, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    project = relationship("Project")
