from datetime import datetime

from fastapi import HTTPException, Request
from sqlalchemy.orm import Session

from models import Session as DBSession, User


def current_user(request: Request, db: Session) -> User:
    token = request.cookies.get("session_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session = db.query(DBSession).filter(DBSession.session_token == token).first()
    if not session or session.expires_at < datetime.utcnow():
        raise HTTPException(status_code=401, detail="Session expired")
    user = db.query(User).filter(User.id == session.user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

