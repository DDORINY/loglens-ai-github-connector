from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.ci_analysis_report import CIAnalysisReport
from app.models.github_repository import GithubRepository
from app.models.incident_report import IncidentReport
from app.models.project import Project
from app.models.server_log_analysis_report import ServerLogAnalysisReport
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.incident_report import (
    IncidentAutoCreateRequest,
    IncidentCandidateResponse,
    IncidentReportCreate,
    IncidentReportResponse,
)
from app.services.incident_analysis_service import (
    build_incident_analysis,
    build_incident_candidate,
)


router = APIRouter(prefix="/api/incidents", tags=["Incidents"])


def find_existing_incident_report(
    payload: IncidentReportCreate,
    db: Session,
) -> IncidentReport | None:
    return (
        db.query(IncidentReport)
        .filter(
            IncidentReport.project_id == payload.project_id,
            IncidentReport.github_analysis_report_id == payload.github_analysis_report_id,
            IncidentReport.server_log_analysis_report_id == payload.server_log_analysis_report_id,
        )
        .first()
    )


def get_user_project(
    project_id: int,
    db: Session,
    current_user: User,
) -> Project:
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

    return project


def get_user_ci_report(
    report_id: int,
    project_id: int,
    db: Session,
    current_user: User,
) -> CIAnalysisReport:
    report = (
        db.query(CIAnalysisReport)
        .join(GithubRepository, GithubRepository.id == CIAnalysisReport.repository_id)
        .join(Project, Project.id == GithubRepository.project_id)
        .filter(
            CIAnalysisReport.id == report_id,
            Project.id == project_id,
            Project.user_id == current_user.id,
        )
        .first()
    )

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="GitHub Actions 분석 리포트를 찾을 수 없습니다.",
        )

    return report


def get_user_server_log_report(
    report_id: int,
    project_id: int,
    db: Session,
    current_user: User,
) -> ServerLogAnalysisReport:
    report = (
        db.query(ServerLogAnalysisReport)
        .join(Project, Project.id == ServerLogAnalysisReport.project_id)
        .filter(
            ServerLogAnalysisReport.id == report_id,
            Project.id == project_id,
            Project.user_id == current_user.id,
        )
        .first()
    )

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="서버 로그 분석 리포트를 찾을 수 없습니다.",
        )

    return report


def get_incident_candidates(
    ci_report: CIAnalysisReport,
    project_id: int,
    limit: int,
    db: Session,
) -> list[IncidentCandidateResponse]:
    server_reports = (
        db.query(ServerLogAnalysisReport)
        .filter(ServerLogAnalysisReport.project_id == project_id)
        .order_by(ServerLogAnalysisReport.created_at.desc())
        .limit(limit)
        .all()
    )

    candidates = [
        IncidentCandidateResponse.model_validate(
            build_incident_candidate(
                ci_report=ci_report,
                server_report=server_report,
            )
        )
        for server_report in server_reports
    ]
    candidates.sort(
        key=lambda candidate: (
            candidate.candidate_score,
            candidate.created_at,
        ),
        reverse=True,
    )
    return candidates


def persist_incident_report(
    payload: IncidentReportCreate,
    ci_report: CIAnalysisReport,
    server_report: ServerLogAnalysisReport,
    db: Session,
) -> tuple[IncidentReport, bool]:
    existing_report = find_existing_incident_report(payload=payload, db=db)

    if existing_report:
        return existing_report, True

    analysis = build_incident_analysis(
        ci_report=ci_report,
        server_report=server_report,
    )

    incident_report = IncidentReport(
        project_id=payload.project_id,
        github_analysis_report_id=payload.github_analysis_report_id,
        server_log_analysis_report_id=payload.server_log_analysis_report_id,
        status="OPEN",
        title=analysis["title"],
        severity=analysis["severity"],
        summary=analysis["summary"],
        combined_evidence=analysis["combined_evidence"],
        root_cause_candidates=analysis["root_cause_candidates"],
        recommended_actions=analysis["recommended_actions"],
        analysis_score=analysis["analysis_score"],
        engine_version=analysis["engine_version"],
    )

    try:
        db.add(incident_report)
        db.commit()
        db.refresh(incident_report)
    except IntegrityError:
        db.rollback()
        existing_report = find_existing_incident_report(payload=payload, db=db)

        if existing_report:
            return existing_report, True

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="통합 장애 리포트 생성 중 데이터 충돌이 발생했습니다.",
        )

    return incident_report, False


@router.post("", response_model=ApiResponse)
def create_incident_report(
    payload: IncidentReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_user_project(
        project_id=payload.project_id,
        db=db,
        current_user=current_user,
    )

    ci_report = get_user_ci_report(
        report_id=payload.github_analysis_report_id,
        project_id=payload.project_id,
        db=db,
        current_user=current_user,
    )

    server_report = get_user_server_log_report(
        report_id=payload.server_log_analysis_report_id,
        project_id=payload.project_id,
        db=db,
        current_user=current_user,
    )

    incident_report, duplicated = persist_incident_report(
        payload=payload,
        ci_report=ci_report,
        server_report=server_report,
        db=db,
    )

    return ApiResponse(
        success=True,
        data=IncidentReportResponse.model_validate(incident_report),
        message=(
            "이미 생성된 통합 장애 리포트를 반환했습니다."
            if duplicated
            else "통합 장애 리포트가 생성되었습니다."
        ),
    )


@router.get("/candidates", response_model=ApiResponse)
def list_incident_candidates(
    project_id: int = Query(...),
    github_analysis_report_id: int = Query(...),
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_user_project(
        project_id=project_id,
        db=db,
        current_user=current_user,
    )
    ci_report = get_user_ci_report(
        report_id=github_analysis_report_id,
        project_id=project_id,
        db=db,
        current_user=current_user,
    )
    candidates = get_incident_candidates(
        ci_report=ci_report,
        project_id=project_id,
        limit=limit,
        db=db,
    )

    return ApiResponse(
        success=True,
        data=candidates,
        message="통합 장애 후보 조회에 성공했습니다.",
    )


@router.post("/auto", response_model=ApiResponse)
def auto_create_incident_report(
    payload: IncidentAutoCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_user_project(
        project_id=payload.project_id,
        db=db,
        current_user=current_user,
    )
    ci_report = get_user_ci_report(
        report_id=payload.github_analysis_report_id,
        project_id=payload.project_id,
        db=db,
        current_user=current_user,
    )
    candidates = get_incident_candidates(
        ci_report=ci_report,
        project_id=payload.project_id,
        limit=5,
        db=db,
    )

    if not candidates:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="추천할 서버 로그 분석 리포트가 없습니다.",
        )

    selected_candidate = candidates[0]
    server_report = get_user_server_log_report(
        report_id=selected_candidate.server_log_analysis_report_id,
        project_id=payload.project_id,
        db=db,
        current_user=current_user,
    )
    create_payload = IncidentReportCreate(
        project_id=payload.project_id,
        github_analysis_report_id=payload.github_analysis_report_id,
        server_log_analysis_report_id=selected_candidate.server_log_analysis_report_id,
    )
    incident_report, duplicated = persist_incident_report(
        payload=create_payload,
        ci_report=ci_report,
        server_report=server_report,
        db=db,
    )

    return ApiResponse(
        success=True,
        data=IncidentReportResponse.model_validate(incident_report),
        message=(
            "추천 후보로 이미 생성된 통합 장애 리포트를 반환했습니다."
            if duplicated
            else "가장 높은 추천 후보로 통합 장애 리포트를 생성했습니다."
        ),
    )


@router.get("", response_model=ApiResponse)
def list_incident_reports(
    project_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_user_project(
        project_id=project_id,
        db=db,
        current_user=current_user,
    )

    reports = (
        db.query(IncidentReport)
        .filter(IncidentReport.project_id == project_id)
        .order_by(IncidentReport.created_at.desc())
        .all()
    )

    return ApiResponse(
        success=True,
        data=[IncidentReportResponse.model_validate(report) for report in reports],
        message="통합 장애 리포트 목록 조회에 성공했습니다.",
    )


@router.get("/{incident_id}", response_model=ApiResponse)
def get_incident_report(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = (
        db.query(IncidentReport)
        .join(Project, Project.id == IncidentReport.project_id)
        .filter(
            IncidentReport.id == incident_id,
            Project.user_id == current_user.id,
        )
        .first()
    )

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="통합 장애 리포트를 찾을 수 없습니다.",
        )

    return ApiResponse(
        success=True,
        data=IncidentReportResponse.model_validate(report),
        message="통합 장애 리포트 상세 조회에 성공했습니다.",
    )
