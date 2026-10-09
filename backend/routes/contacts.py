from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User, Contact
from schemas import ContactCreateRequest
from auth_utils import current_user


router = APIRouter(
    prefix="/contacts",
    tags=["Contacts"]
)


@router.get("/")
def get_contacts(
    request: Request,
    db: Session = Depends(get_db)
):
    user = current_user(request, db)

    # Get contacts
    contacts = db.query(Contact).filter(
        Contact.user_id == user.id
    ).all()

    result = []

    for contact in contacts:

        user = db.query(User).filter(
            User.id == contact.contact_id
        ).first()

        if user:
            result.append({
                "id": user.id,
                "username": user.username,
                "display_name": user.display_name,
                "avatar_url": user.avatar_url,
                "last_seen": user.last_seen
            })

    return result


@router.get("/search")
def search_users(q: str, request: Request, db: Session = Depends(get_db)):
    user = current_user(request, db)
    query = q.strip()
    if not query:
        return []
    users = db.query(User).filter(
        User.id != user.id,
        (User.username.ilike(f"%{query}%")) | (User.display_name.ilike(f"%{query}%")) | (User.phone.ilike(f"%{query}%")),
    ).limit(20).all()
    return [{
        "id": item.id,
        "username": item.username,
        "display_name": item.display_name,
        "avatar_url": item.avatar_url,
        "last_seen": item.last_seen,
        "is_contact": db.query(Contact).filter(Contact.user_id == user.id, Contact.contact_id == item.id).first() is not None,
    } for item in users]


@router.post("/")
def add_contact(data: ContactCreateRequest, request: Request, db: Session = Depends(get_db)):
    user = current_user(request, db)
    identifier = (data.username or data.phone or "").strip()
    if not identifier:
        raise HTTPException(status_code=400, detail="Enter a username or phone number")
    contact = db.query(User).filter((User.username == identifier) | (User.phone == identifier)).first()
    if not contact:
        raise HTTPException(status_code=404, detail="No account found for that username or phone")
    if contact.id == user.id:
        raise HTTPException(status_code=400, detail="You are already in your contacts")
    existing = db.query(Contact).filter(Contact.user_id == user.id, Contact.contact_id == contact.id).first()
    if not existing:
        db.add(Contact(user_id=user.id, contact_id=contact.id))
        db.commit()
    return {
        "id": contact.id,
        "username": contact.username,
        "display_name": contact.display_name,
        "avatar_url": contact.avatar_url,
        "last_seen": contact.last_seen,
    }
