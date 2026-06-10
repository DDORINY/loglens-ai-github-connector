from datetime import datetime

from pydantic import BaseModel, Field


class GithubRepositoryConnect(BaseModel):
    project_id: int
    owner: str = Field(min_length=1, max_length=255)
    repo: str = Field(min_length=1, max_length=255)
    access_token: str = Field(min_length=1)


class GithubRepositoryResponse(BaseModel):
    id: int
    project_id: int
    owner: str
    repo: str
    default_branch: str | None
    connected_at: datetime

    model_config = {
        "from_attributes": True
    }
