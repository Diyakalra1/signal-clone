from datetime import datetime, timedelta
import secrets
import os

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Response,
    Request,
)

from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import User, Session as DBSession, Conversation, ConversationMember
from schemas import ProfileUpdateRequest

from schemas import (
    RegisterRequest,
    VerifyOTPRequest,
    LoginRequest,
    OTPRequest,
    UserResponse,
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


def ensure_note_to_self(user_id: int, db: Session):
    note = db.query(Conversation).join(ConversationMember).filter(
        Conversation.type == "direct",
        Conversation.name == "Note to Self",
        ConversationMember.user_id == user_id,
    ).first()
    if note:
        return
    note = Conversation(type="direct", name="Note to Self", updated_at=datetime.utcnow())
    db.add(note)
    db.flush()
    db.add(ConversationMember(conversation_id=note.id, user_id=user_id, role="admin"))
    db.commit()


# Mock OTP
MOCK_OTP = "123456"

# Session lifetime
SESSION_DAYS = 7


# =========================================
# REGISTER
# =========================================

@router.post("/register")
def register(
    data: RegisterRequest,
    db: Session = Depends(get_db)
):
    username = (data.username or data.phone or "").strip()
    phone = (data.phone or "").strip()
    if not username:
        raise HTTPException(status_code=400, detail="Enter a username or phone number")

    existing_user = db.query(User).filter(
        (User.username == username) | (User.phone == phone if phone else User.id == -1)
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Username already exists"
        )

    return {
        "message": "OTP sent successfully",
        "otp_required": True,
        "otp": MOCK_OTP
    }


# =========================================
# VERIFY OTP / CREATE USER
# =========================================

@router.post(
    "/verify-otp",
    response_model=UserResponse
)
def verify_otp(
    data: VerifyOTPRequest,
    response: Response,
    db: Session = Depends(get_db)
):

    if data.otp != MOCK_OTP:
        raise HTTPException(
            status_code=400,
            detail="Invalid OTP"
        )

    username = (data.username or data.phone or "").strip()
    if not username:
        raise HTTPException(status_code=400, detail="Enter a username or phone number")
    existing_user = (
        db.query(User)
        .filter((User.username == username) | (User.phone == (data.phone or "")))
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="User already exists"
        )

    user = User(
    username=username,
    phone=data.phone,
    display_name=(data.display_name or username).strip(),
    avatar_url=data.avatar_url
)

    db.add(user)
    db.commit()
    db.refresh(user)
    ensure_note_to_self(user.id, db)

    token = create_session(
        user.id,
        response,
        db
    )

    return user


# =========================================
# LOGIN
# =========================================

@router.post("/login/request-otp")
def request_login_otp(data: OTPRequest, db: Session = Depends(get_db)):
    identifier = (data.username or data.phone or "").strip()
    if not identifier:
        raise HTTPException(status_code=400, detail="Enter your username or phone number")
    user = db.query(User).filter(
        (func.lower(User.username) == identifier.lower()) | (User.phone == identifier)
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found. Create an account first.")
    return {"message": "OTP ready", "otp_required": True, "otp": MOCK_OTP}

@router.post(
    "/login",
    response_model=UserResponse
)
def login(
    data: LoginRequest,
    response: Response,
    db: Session = Depends(get_db)
):

    if data.otp != MOCK_OTP:
        raise HTTPException(
            status_code=400,
            detail="Invalid OTP"
        )

    identifier = (data.username or data.phone or "").strip()
    if not identifier:
        raise HTTPException(status_code=400, detail="Enter a username or phone number")
    user = (
        db.query(User)
        .filter((func.lower(User.username) == identifier.lower()) | (User.phone == identifier))
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    ensure_note_to_self(user.id, db)

    create_session(
        user.id,
        response,
        db
    )

    user.last_seen = datetime.utcnow()

    db.commit()

    return user


# =========================================
# LOGOUT
# =========================================

@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):

    token = request.cookies.get("session_token")

    if token:
        session = (
            db.query(DBSession)
            .filter(
                DBSession.session_token == token
            )
            .first()
        )

        if session:
            db.delete(session)
            db.commit()

    response.delete_cookie(
        key="session_token"
    )

    return {
        "message": "Logged out successfully"
    }


# =========================================
# CURRENT USER
# =========================================

@router.get(
    "/me",
    response_model=UserResponse
)
def get_current_user(
    request: Request,
    db: Session = Depends(get_db)
):

    token = request.cookies.get("session_token")

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated"
        )

    session = (
        db.query(DBSession)
        .filter(
            DBSession.session_token == token
        )
        .first()
    )

    if not session:
        raise HTTPException(
            status_code=401,
            detail="Invalid session"
        )

    if session.expires_at < datetime.utcnow():

        db.delete(session)
        db.commit()

        raise HTTPException(
            status_code=401,
            detail="Session expired"
        )

    user = (
        db.query(User)
        .filter(User.id == session.user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    ensure_note_to_self(user.id, db)

    return user


@router.patch("/me", response_model=UserResponse)
def update_current_user(
    data: ProfileUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    from auth_utils import current_user

    user = current_user(request, db)
    if data.display_name is not None:
        name = data.display_name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Display name cannot be empty")
        user.display_name = name[:80]
    if data.avatar_url is not None:
        user.avatar_url = data.avatar_url
    db.commit()
    db.refresh(user)
    return user


# =========================================
# SESSION CREATION
# =========================================

def create_session(
    user_id: int,
    response: Response,
    db: Session
):

    token = secrets.token_urlsafe(32)

    session = DBSession(
        user_id=user_id,
        session_token=token,
        expires_at=(
            datetime.utcnow()
            + timedelta(days=SESSION_DAYS)
        )
    )

    db.add(session)
    db.commit()

    cookie_secure = os.getenv("COOKIE_SECURE", "false").lower() == "true"
    cookie_samesite = os.getenv("COOKIE_SAMESITE", "lax").lower()
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        max_age=SESSION_DAYS * 24 * 60 * 60,
        samesite=cookie_samesite,
        secure=cookie_secure,
        path="/",
    )

    return token
