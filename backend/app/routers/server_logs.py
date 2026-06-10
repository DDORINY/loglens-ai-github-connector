from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.project import Project
from app.models.server_log import ServerLog
from app.models.server_log_analysis_report import ServerLogAnalysisReport
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.server_log import (
    ServerLogAnalysisReportResponse,
    ServerLogListItem,
    ServerLogResponse,
)
from app.services.secret_masking_service import mask_text
from app.services.server_log_analysis_service import analyze_server_log_content


router = APIRouter(prefix="/api/server-logs", tags=["Server Logs"])


MAX_LOG_SIZE_BYTES = 2 * 1024 * 1024
ALLOWED_EXTENSIONS = {".log", ".txt"}


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


def get_user_server_log(
    log_id: int,
    db: Session,
    current_user: User,
) -> ServerLog:
    server_log = (
        db.query(ServerLog)
        .join(Project, Project.id == ServerLog.project_id)
        .filter(
            ServerLog.id == log_id,
            Project.user_id == current_user.id,
        )
        .first()
    )

    if not server_log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="서버 로그를 찾을 수 없습니다.",
        )

    return server_log


def validate_filename(filename: str) -> None:
    lower = filename.lower()

    if not any(lower.endswith(ext) for ext in ALLOWED_EXTENSIONS):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=".log 또는 .txt 파일만 업로드할 수 있습니다.",
        )


@router.post("/upload", response_model=ApiResponse)
async def upload_server_log(
    project_id: int = Form(...),
    source: str | None = Form(default=None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_user_project(
        project_id=project_id,
        db=db,
        current_user=current_user,
    )

    filename = file.filename or "server.log"
    validate_filename(filename)

    content_bytes = await file.read()

    if len(content_bytes) > MAX_LOG_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="서버 로그 파일은 최대 2MB까지만 업로드할 수 있습니다.",
        )

    try:
        raw_content = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        raw_content = content_bytes.decode("cp949", errors="replace")

    masked_content = mask_text(raw_content)

    server_log = ServerLog(
        project_id=project_id,
        filename=filename,
        content_type=file.content_type,
        size_bytes=len(content_bytes),
        source=source,
        raw_content=masked_content,
    )

    db.add(server_log)
    db.commit()
    db.refresh(server_log)

    return ApiResponse(
        success=True,
        data=ServerLogResponse.model_validate(server_log),
        message="서버 로그가 업로드되었습니다.",
    )


@router.get("", response_model=ApiResponse)
def list_server_logs(
    project_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_user_project(
        project_id=project_id,
        db=db,
        current_user=current_user,
    )

    logs = (
        db.query(ServerLog)
        .filter(ServerLog.project_id == project_id)
        .order_by(ServerLog.created_at.desc())
        .all()
    )

    return ApiResponse(
        success=True,
        data=[ServerLogListItem.model_validate(log) for log in logs],
        message="서버 로그 목록 조회에 성공했습니다.",
    )


@router.get("/reports/{report_id}", response_model=ApiResponse)
def get_server_log_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = (
        db.query(ServerLogAnalysisReport)
        .join(Project, Project.id == ServerLogAnalysisReport.project_id)
        .filter(
            ServerLogAnalysisReport.id == report_id,
            Project.user_id == current_user.id,
        )
        .first()
    )

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="서버 로그 분석 리포트를 찾을 수 없습니다.",
        )

    return ApiResponse(
        success=True,
        data=ServerLogAnalysisReportResponse.model_validate(report),
        message="서버 로그 분석 리포트 상세 조회에 성공했습니다.",
    )


@router.get("/{log_id}", response_model=ApiResponse)
def get_server_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    server_log = get_user_server_log(
        log_id=log_id,
        db=db,
        current_user=current_user,
    )

    return ApiResponse(
        success=True,
        data=ServerLogResponse.model_validate(server_log),
        message="서버 로그 상세 조회에 성공했습니다.",
    )


@router.post("/{log_id}/analyze", response_model=ApiResponse)
def analyze_server_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    server_log = get_user_server_log(
        log_id=log_id,
        db=db,
        current_user=current_user,
    )

    analysis = analyze_server_log_content(server_log.raw_content)

    report = ServerLogAnalysisReport(
        project_id=server_log.project_id,
        server_log_id=server_log.id,
        category=analysis["category"],
        severity=analysis["severity"],
        summary=analysis["summary"],
        evidence=analysis["evidence"],
        error_groups=analysis["error_groups"],
        suspected_causes=analysis["suspected_causes"],
        recommended_actions=analysis["recommended_actions"],
        analysis_score=analysis["analysis_score"],
        engine_version=analysis["engine_version"],
    )

    db.add(report)
    db.commit()
    db.refresh(report)

    return ApiResponse(
        success=True,
        data=ServerLogAnalysisReportResponse.model_validate(report),
        message="서버 로그 분석이 완료되었습니다.",
    )


@router.get("/{log_id}/reports", response_model=ApiResponse)
def list_server_log_reports(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    server_log = get_user_server_log(
        log_id=log_id,
        db=db,
        current_user=current_user,
    )

    reports = (
        db.query(ServerLogAnalysisReport)
        .filter(ServerLogAnalysisReport.server_log_id == server_log.id)
        .order_by(ServerLogAnalysisReport.created_at.desc())
        .all()
    )

    return ApiResponse(
        success=True,
        data=[ServerLogAnalysisReportResponse.model_validate(report) for report in reports],
        message="서버 로그 분석 리포트 목록 조회에 성공했습니다.",
    )
