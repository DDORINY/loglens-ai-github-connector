from pydantic import BaseModel, Field


class GithubIssueCreateFromRun(BaseModel):
    labels: list[str] = Field(default_factory=lambda: ["ci-failure", "loglens"])
