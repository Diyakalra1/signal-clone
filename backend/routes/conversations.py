from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from database import get_db
from models import (
    User,
    Conversation,
    ConversationMember,
    Message,
    Session as DBSession,
    Contact,
    MessageReceipt,
)
from schemas import DirectConversationRequest, GroupCreateRequest, GroupMemberRequest
from auth_utils import current_user
from routes.websocket import manager


router = APIRouter(
    prefix="/conversations",
    tags=["Conversations"]
)


@router.get("/")
def get_conversations(
    request: Request,
    db: Session = Depends(get_db)
):

    user = current_user(request, db)
    user_id = user.id


    # -------------------------
    # 2. Find user's chats
    # -------------------------

    memberships = db.query(ConversationMember).filter(
        ConversationMember.user_id == user_id
    ).all()

    result = []


    # -------------------------
    # 3. Process each chat
    # -------------------------

    for membership in memberships:

        conversation = db.query(Conversation).filter(
            Conversation.id == membership.conversation_id
        ).first()

        if not conversation:
            continue


        # -------------------------
        # 4. Find latest message
        # -------------------------

        last_message = (
            db.query(Message)
            .filter(
                Message.conversation_id == conversation.id
            )
            .order_by(Message.created_at.desc())
            .first()
        )


        # -------------------------
        # 5. Determine chat name
        # -------------------------

        if conversation.name == "Note to Self":
            chat_name = "Note to Self"
            peer_id = None
            chat_avatar = conversation.avatar_url
        elif conversation.type == "group":

            chat_name = conversation.name
            peer_id = None
            chat_avatar = conversation.avatar_url

        else:

            # Find the OTHER person
            other_member = (
                db.query(ConversationMember)
                .filter(
                    ConversationMember.conversation_id == conversation.id,
                    ConversationMember.user_id != user_id
                )
                .first()
            )

            if other_member:

                other_user = db.query(User).filter(
                    User.id == other_member.user_id
                ).first()

                chat_name = (
                    other_user.display_name
                    if other_user
                    else "Unknown"
                )
                peer_id = other_user.id if other_user else None
                chat_avatar = other_user.avatar_url if other_user else conversation.avatar_url

            else:
                chat_name = "Unknown"
                peer_id = None
                chat_avatar = conversation.avatar_url


        # -------------------------
        # 6. Add conversation
        # -------------------------

        result.append({
            "id": conversation.id,
            "type": conversation.type,
            "name": chat_name,
            "peer_id": peer_id,
            "avatar_url": chat_avatar,
            "last_message": (
                last_message.content
                if last_message
                else None
            ),
            "last_message_sender_id": last_message.sender_id if last_message else None,
            "last_message_status": last_message.status if last_message else None,
            "unread": db.query(MessageReceipt).filter(
                MessageReceipt.user_id == user_id,
                MessageReceipt.status != "read",
                MessageReceipt.message_id.in_(
                    db.query(Message.id).filter(
                        Message.conversation_id == conversation.id,
                        Message.sender_id != user_id,
                    )
                ),
            ).count(),
            "last_message_at": (
                last_message.created_at
                if last_message
                else conversation.updated_at
            )
        })


    # -------------------------
    # 7. Newest chat first
    # -------------------------

    result.sort(
        key=lambda x: x["last_message_at"],
        reverse=True
    )

    return result


@router.post("/direct")
def create_direct(data: DirectConversationRequest, request: Request, db: Session = Depends(get_db)):
    user = current_user(request, db)
    if data.contact_id == user.id:
        raise HTTPException(status_code=400, detail="Use Note to Self for a private note")
    contact = db.query(User).filter(User.id == data.contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    for membership in db.query(ConversationMember).filter(ConversationMember.user_id == user.id).all():
        conversation = db.query(Conversation).filter(
            Conversation.id == membership.conversation_id,
            Conversation.type == "direct",
        ).first()
        if conversation and db.query(ConversationMember).filter(
            ConversationMember.conversation_id == conversation.id,
            ConversationMember.user_id == contact.id,
        ).first():
            return {"id": conversation.id, "type": "direct", "name": contact.display_name}
    conversation = Conversation(type="direct", updated_at=datetime.utcnow())
    db.add(conversation)
    db.flush()
    db.add_all([
        ConversationMember(conversation_id=conversation.id, user_id=user.id, role="admin"),
        ConversationMember(conversation_id=conversation.id, user_id=contact.id, role="member"),
    ])
    if not db.query(Contact).filter(Contact.user_id == user.id, Contact.contact_id == contact.id).first():
        db.add(Contact(user_id=user.id, contact_id=contact.id))
    db.commit()
    return {"id": conversation.id, "type": "direct", "name": contact.display_name}


@router.post("/groups")
def create_group(data: GroupCreateRequest, request: Request, db: Session = Depends(get_db)):
    user = current_user(request, db)
    name = data.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Group name is required")
    member_ids = set(data.member_ids) | {user.id}
    if len(member_ids) < 2:
        raise HTTPException(status_code=400, detail="Choose at least one other member")
    if len(member_ids) < 2:
        raise HTTPException(status_code=400, detail="Choose at least one other member")
    members = db.query(User).filter(User.id.in_(member_ids)).all()
    if len(members) != len(member_ids):
        raise HTTPException(status_code=404, detail="One or more members were not found")
    conversation = Conversation(type="group", name=name[:80], updated_at=datetime.utcnow())
    db.add(conversation)
    db.flush()
    for member in members:
        db.add(ConversationMember(
            conversation_id=conversation.id,
            user_id=member.id,
            role="admin" if member.id == user.id else "member",
        ))
    db.commit()
    return {"id": conversation.id, "type": "group", "name": conversation.name}


def _group_admin(conversation_id: int, request: Request, db: Session):
    user = current_user(request, db)
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    membership = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == user.id,
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="You are not a member of this conversation")
    return user, conversation, membership


@router.get("/{conversation_id}/members")
def get_members(conversation_id: int, request: Request, db: Session = Depends(get_db)):
    _, conversation, _ = _group_admin(conversation_id, request, db)
    rows = db.query(ConversationMember).filter(ConversationMember.conversation_id == conversation_id).all()
    return [{
        "id": row.user.id,
        "username": row.user.username,
        "display_name": row.user.display_name,
        "avatar_url": row.user.avatar_url,
        "role": row.role,
    } for row in rows]


@router.post("/{conversation_id}/members")
def add_group_member(conversation_id: int, data: GroupMemberRequest, request: Request, db: Session = Depends(get_db)):
    _, conversation, membership = _group_admin(conversation_id, request, db)
    if conversation.type != "group" or membership.role != "admin":
        raise HTTPException(status_code=403, detail="Only group admins can add members")
    member = db.query(User).filter(User.id == data.user_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="User not found")
    exists = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == member.id,
    ).first()
    if not exists:
        db.add(ConversationMember(conversation_id=conversation_id, user_id=member.id, role="member"))
        db.commit()
    return {"message": "Member added"}


@router.delete("/{conversation_id}/members/{member_id}")
async def remove_group_member(conversation_id: int, member_id: int, request: Request, db: Session = Depends(get_db)):
    user, conversation, membership = _group_admin(conversation_id, request, db)
    if conversation.type != "group" or membership.role != "admin":
        raise HTTPException(status_code=403, detail="Only group admins can remove members")
    target = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == member_id,
    ).first()
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(target)
    db.commit()
    await manager.revoke_conversation_member(conversation_id, member_id)
    return {"message": "Member removed"}
