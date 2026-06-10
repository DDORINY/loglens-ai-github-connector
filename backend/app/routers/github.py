from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.crypto import decrypt_text, encrypt_text
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.ci_analysis_report import CIAnalysisReport
from app.models.github_repository import GithubRepository
from app.models.project import Project
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.github_issue import GithubIssueCreateFromRun
from app.schemas.github_repository import (
    GithubRepositoryConnect,
    GithubRepositoryResponse,
)
from app.services.log_analysis_service import analyze_github_actions_logs
from app.services.github_service import (
    create_github_issue,
    download_workflow_run_logs,
    get_repository,
    list_workflow_runs,
)


router = APIRouter(prefix="/api/github", tags=["GitHub"])


def get_user_repository(
    repository_id: int,
    db: Session,
    current_user: User,
) -> GithubRepository:
    repository = (
        db.query(GithubRepository)
        .join(Project, Project.id == GithubRepository.project_id)
        .filter(
            GithubRepository.id == repository_id,
            Project.user_id == current_user.id,
        )
        .first()
    )

    if not repository:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="GitHub 저장소 연결 정보를 찾을 수 없습니다.",
        )

    return repository


@router.post("/repositories/connect", response_model=ApiResponse)
def connect_repository(
    payload: GithubRepositoryConnect,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = (
        db.query(Project)
        .filter(Project.id == payload.project_id, Project.user_id == current_user.id)
        .first()
    )

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="프로젝트를 찾을 수 없습니다.",
        )

    repo_info = get_repository(
        owner=payload.owner,
        repo=payload.repo,
        token=payload.access_token,
    )

    existing = (
        db.query(GithubRepository)
        .filter(
            GithubRepository.project_id == payload.project_id,
            GithubRepository.owner == payload.owner,
            GithubRepository.repo == payload.repo,
        )
        .first()
    )

    if existing:
        existing.default_branch = repo_info.get("default_branch")
        existing.token_encrypted = encrypt_text(payload.access_token)
        db.commit()
        db.refresh(existing)

        return ApiResponse(
            success=True,
            data=GithubRepositoryResponse.model_validate(existing),
            message="GitHub 저장소 연결 정보가 갱신되었습니다.",
        )

    repository = GithubRepository(
        project_id=payload.project_id,
        owner=payload.owner,
        repo=payload.repo,
        default_branch=repo_info.get("default_branch"),
        token_encrypted=encrypt_text(payload.access_token),
    )

    db.add(repository)
    db.commit()
    db.refresh(repository)

    return ApiResponse(
        success=True,
        data=GithubRepositoryResponse.model_validate(repository),
        message="GitHub 저장소가 연결되었습니다.",
    )


@router.get("/repositories", response_model=ApiResponse)
def list_repositories(
    project_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.user_id == current_user.id)
        .first()
    )

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="프로젝트를 찾을 수 없습니다.",
        )

    repositories = (
        db.query(GithubRepository)
        .filter(GithubRepository.project_id == project_id)
        .order_by(GithubRepository.connected_at.desc())
        .all()
    )

    return ApiResponse(
        success=True,
        data=[
            GithubRepositoryResponse.model_validate(repository)
            for repository in repositories
        ],
        message="GitHub 저장소 목록 조회에 성공했습니다.",
    )


@router.get("/repositories/{repository_id}", response_model=ApiResponse)
def get_connected_repository(
    repository_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repository = get_user_repository(
        repository_id=repository_id,
        db=db,
        current_user=current_user,
    )

    return ApiResponse(
        success=True,
        data=GithubRepositoryResponse.model_validate(repository),
        message="GitHub 저장소 상세 조회에 성공했습니다.",
    )


@router.get("/repositories/{repository_id}/actions/runs", response_model=ApiResponse)
def get_actions_runs(
    repository_id: int,
    status_value: str | None = Query(default="completed", alias="status"),
    conclusion: str | None = Query(default=None),
    per_page: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repository = get_user_repository(
        repository_id=repository_id,
        db=db,
        current_user=current_user,
    )

    token = decrypt_text(repository.token_encrypted)

    runs = list_workflow_runs(
        owner=repository.owner,
        repo=repository.repo,
        token=token,
        status_value=status_value,
        conclusion=conclusion,
        per_page=per_page,
    )

    return ApiResponse(
        success=True,
        data=runs,
        message="GitHub Actions workflow run 목록 조회에 성공했습니다.",
    )


@router.get(
    "/repositories/{repository_id}/actions/runs/{run_id}/logs",
    response_model=ApiResponse,
)
def get_actions_run_logs(
    repository_id: int,
    run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repository = get_user_repository(
        repository_id=repository_id,
        db=db,
        current_user=current_user,
    )

    token = decrypt_text(repository.token_encrypted)

    logs = download_workflow_run_logs(
        owner=repository.owner,
        repo=repository.repo,
        token=token,
        run_id=run_id,
    )

    return ApiResponse(
        success=True,
        data=logs,
        message="GitHub Actions workflow 로그 조회에 성공했습니다.",
    )


@router.get(
    "/repositories/{repository_id}/actions/runs/{run_id}/analysis",
    response_model=ApiResponse,
)
def analyze_actions_run_logs(
    repository_id: int,
    run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repository = get_user_repository(
        repository_id=repository_id,
        db=db,
        current_user=current_user,
    )

    token = decrypt_text(repository.token_encrypted)

    logs = download_workflow_run_logs(
        owner=repository.owner,
        repo=repository.repo,
        token=token,
        run_id=run_id,
    )

    analysis = analyze_github_actions_logs(logs)

    return ApiResponse(
        success=True,
        data={
            "repository_id": repository.id,
            "owner": repository.owner,
            "repo": repository.repo,
            "run_id": run_id,
            "analysis": analysis,
        },
        message="GitHub Actions 실패 로그 분석에 성공했습니다.",
    )


@router.post(
    "/repositories/{repository_id}/actions/runs/{run_id}/issues",
    response_model=ApiResponse,
)
def create_issue_from_actions_run(
    repository_id: int,
    run_id: int,
    payload: GithubIssueCreateFromRun,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repository = get_user_repository(
        repository_id=repository_id,
        db=db,
        current_user=current_user,
    )

    token = decrypt_text(repository.token_encrypted)

    logs = download_workflow_run_logs(
        owner=repository.owner,
        repo=repository.repo,
        token=token,
        run_id=run_id,
    )

    analysis = analyze_github_actions_logs(logs)

    issue_body = analysis["issue_body"] + "\n\n---\nGenerated by LogLens AI GitHub Connector"

    existing_report = (
        db.query(CIAnalysisReport)
        .filter(
            CIAnalysisReport.repository_id == repository.id,
            CIAnalysisReport.github_run_id == run_id,
        )
        .first()
    )

    if existing_report and existing_report.github_issue_url:
        return ApiResponse(
            success=True,
            data={
                "repository_id": repository.id,
                "owner": repository.owner,
                "repo": repository.repo,
                "run_id": run_id,
                "analysis": analysis,
                "issue": {
                    "github_issue_id": existing_report.github_issue_id,
                    "number": existing_report.github_issue_number,
                    "title": existing_report.issue_title,
                    "state": existing_report.github_issue_state,
                    "html_url": existing_report.github_issue_url,
                },
                "report_id": existing_report.id,
                "duplicated": True,
            },
            message="이미 생성된 GitHub Issue가 있어 기존 리포트를 반환했습니다.",
        )

    issue = create_github_issue(
        owner=repository.owner,
        repo=repository.repo,
        token=token,
        title=analysis["issue_title"],
        body=issue_body,
        labels=payload.labels,
    )

    if existing_report:
        existing_report.category = analysis["category"]
        existing_report.summary = analysis["summary"]
        existing_report.confidence = analysis["confidence"]
        existing_report.evidence = analysis["evidence"]
        existing_report.suspected_causes = analysis["suspected_causes"]
        existing_report.recommended_actions = analysis["recommended_actions"]
        existing_report.issue_title = analysis["issue_title"]
        existing_report.issue_body = issue_body
        existing_report.github_issue_id = issue.get("github_issue_id")
        existing_report.github_issue_number = issue.get("number")
        existing_report.github_issue_url = issue.get("html_url")
        existing_report.github_issue_state = issue.get("state")
        report = existing_report
    else:
        report = CIAnalysisReport(
            repository_id=repository.id,
            github_run_id=run_id,
            category=analysis["category"],
            summary=analysis["summary"],
            confidence=analysis["confidence"],
            evidence=analysis["evidence"],
            suspected_causes=analysis["suspected_causes"],
            recommended_actions=analysis["recommended_actions"],
            issue_title=analysis["issue_title"],
            issue_body=issue_body,
            github_issue_id=issue.get("github_issue_id"),
            github_issue_number=issue.get("number"),
            github_issue_url=issue.get("html_url"),
            github_issue_state=issue.get("state"),
        )
        db.add(report)

    db.commit()
    db.refresh(report)

    return ApiResponse(
        success=True,
        data={
            "repository_id": repository.id,
            "owner": repository.owner,
            "repo": repository.repo,
            "run_id": run_id,
            "analysis": analysis,
            "issue": issue,
            "report_id": report.id,
            "duplicated": False,
        },
        message="GitHub Issue가 생성되고 분석 리포트가 저장되었습니다.",
    )

