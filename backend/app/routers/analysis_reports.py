from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.ci_analysis_report import CIAnalysisReport
from app.models.github_repository import GithubRepository
from app.models.project import Project
from app.models.user import User
from app.schemas.ci_analysis_report import CIAnalysisReportResponse
from app.schemas.common import ApiResponse


router = APIRouter(prefix="/api/analysis-reports", tags=["Analysis Reports"])


@router.get("", response_model=ApiResponse)
def list_analysis_reports(
    repository_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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

    reports = (
        db.query(CIAnalysisReport)
        .filter(CIAnalysisReport.repository_id == repository_id)
        .order_by(CIAnalysisReport.created_at.desc())
        .all()
    )

    return ApiResponse(
        success=True,
        data=[CIAnalysisReportResponse.model_validate(report) for report in reports],
        message="분석 리포트 목록 조회에 성공했습니다.",
    )


@router.get("/{report_id}", response_model=ApiResponse)
def get_analysis_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = (
        db.query(CIAnalysisReport)
        .join(GithubRepository, GithubRepository.id == CIAnalysisReport.repository_id)
        .join(Project, Project.id == GithubRepository.project_id)
        .filter(
            CIAnalysisReport.id == report_id,
            Project.user_id == current_user.id,
        )
        .first()
    )

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="분석 리포트를 찾을 수 없습니다.",
        )

    return ApiResponse(
        success=True,
        data=CIAnalysisReportResponse.model_validate(report),
        message="분석 리포트 상세 조회에 성공했습니다.",
    )
