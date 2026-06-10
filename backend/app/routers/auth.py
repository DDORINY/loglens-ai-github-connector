from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.user import TokenResponse, UserCreate, UserLogin, UserResponse


router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/signup", response_model=ApiResponse)
def signup(payload: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == payload.email).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 가입된 이메일입니다.",
        )

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return ApiResponse(
        success=True,
        data=UserResponse.model_validate(user),
        message="회원가입이 완료되었습니다.",
    )


@router.post("/login", response_model=ApiResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다.",
        )

    access_token = create_access_token(subject=user.id)

    token_response = TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user),
    )

    return ApiResponse(
        success=True,
        data=token_response,
        message="로그인에 성공했습니다.",
    )


@router.get("/me", response_model=ApiResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return ApiResponse(
        success=True,
        data=UserResponse.model_validate(current_user),
        message="내 정보 조회에 성공했습니다.",
    )
