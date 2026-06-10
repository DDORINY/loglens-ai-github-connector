from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.project import Project
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate


router = APIRouter(prefix="/api/projects", tags=["Projects"])


@router.post("", response_model=ApiResponse)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = Project(
        user_id=current_user.id,
        name=payload.name,
        description=payload.description,
    )

    db.add(project)
    db.commit()
    db.refresh(project)

    return ApiResponse(
        success=True,
        data=ProjectResponse.model_validate(project),
        message="프로젝트가 생성되었습니다.",
    )


@router.get("", response_model=ApiResponse)
def list_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    projects = (
        db.query(Project)
        .filter(Project.user_id == current_user.id)
        .order_by(Project.created_at.desc())
        .all()
    )

    return ApiResponse(
        success=True,
        data=[ProjectResponse.model_validate(project) for project in projects],
        message="프로젝트 목록 조회에 성공했습니다.",
    )


@router.get("/{project_id}", response_model=ApiResponse)
def get_project(
    project_id: int,
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

    return ApiResponse(
        success=True,
        data=ProjectResponse.model_validate(project),
        message="프로젝트 상세 조회에 성공했습니다.",
    )


@router.patch("/{project_id}", response_model=ApiResponse)
def update_project(
    project_id: int,
    payload: ProjectUpdate,
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

    if payload.name is not None:
        project.name = payload.name

    if payload.description is not None:
        project.description = payload.description

    db.commit()
    db.refresh(project)

    return ApiResponse(
        success=True,
        data=ProjectResponse.model_validate(project),
        message="프로젝트가 수정되었습니다.",
    )


@router.delete("/{project_id}", response_model=ApiResponse)
def delete_project(
    project_id: int,
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

    db.delete(project)
    db.commit()

    return ApiResponse(
        success=True,
        data={"id": project_id},
        message="프로젝트가 삭제되었습니다.",
    )
