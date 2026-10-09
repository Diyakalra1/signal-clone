from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from schemas import SendMessageRequest
from database import get_db
from models import (
    User,
    Message,
    Conversation,
    ConversationMember,
    MessageReceipt,
)
from auth_utils import current_user


router = APIRouter(
    prefix="/conversations",
    tags=["Messages"]
)


@router.get("/{conversation_id}/messages")
def get_messages(
    conversation_id: int,
    request: Request,
    db: Session = Depends(get_db)
):



    user = current_user(request, db)
    user_id = user.id


    # -------------------------
    # 2. Check membership
    # -------------------------

    membership = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == user_id
    ).first()

    if not membership:
        raise HTTPException(
            status_code=403,
            detail="You are not a member of this conversation"
        )


    # -------------------------
    # 3. Get messages
    # -------------------------

    messages = (
        db.query(Message)
        .filter(
            Message.conversation_id == conversation_id
        )
        .order_by(Message.created_at.asc())
        .all()
    )


    # -------------------------
    # 4. Build response
    # -------------------------

    result = []

    for message in messages:

        sender = db.query(User).filter(
            User.id == message.sender_id
        ).first()

        receipt = db.query(MessageReceipt).filter(
            MessageReceipt.message_id == message.id,
            MessageReceipt.user_id == user_id,
        ).first()
        recipient_receipts = db.query(MessageReceipt).filter(
            MessageReceipt.message_id == message.id,
        ).all()
        result.append({
            "id": message.id,
            "sender_id": message.sender_id,
            "sender_name": (
                sender.display_name
                if sender
                else "Unknown"
            ),
            "content": message.content,
            "status": message.status,
            "receipt_status": receipt.status if receipt else None,
            "receipts": [{"user_id": item.user_id, "status": item.status} for item in recipient_receipts],
            "created_at": message.created_at
        })


    return result


@router.post("/{conversation_id}/read")
def mark_read(conversation_id: int, request: Request, db: Session = Depends(get_db)):
    user = current_user(request, db)
    if not db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == user.id,
    ).first():
        raise HTTPException(status_code=403, detail="You are not a member of this conversation")
    messages = db.query(Message).filter(
        Message.conversation_id == conversation_id,
        Message.sender_id != user.id,
    ).all()
    now = datetime.utcnow()
    for message in messages:
        receipt = db.query(MessageReceipt).filter(
            MessageReceipt.message_id == message.id,
            MessageReceipt.user_id == user.id,
        ).first()
        if not receipt:
            db.add(MessageReceipt(message_id=message.id, user_id=user.id, status="read", updated_at=now))
        elif receipt.status != "read":
            receipt.status = "read"
            receipt.updated_at = now
    db.commit()
    return {"message": "Marked as read"}



@router.post("/{conversation_id}/messages")
def send_message(
    conversation_id: int,
    data: SendMessageRequest,
    request: Request,
    db: Session = Depends(get_db)
):

    user = current_user(request, db)
    user_id = user.id

    # 2. Check conversation membership
    membership = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == user_id
    ).first()

    if not membership:
        raise HTTPException(
            status_code=403,
            detail="You are not a member of this conversation"
        )

    # 3. Validate content
    content = data.content.strip()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty"
        )

    # 4. Create message
    message = Message(
        conversation_id=conversation_id,
        sender_id=user_id,
        content=content,
        status="sent"
    )

    db.add(message)
    db.flush()
    member_ids = [row.user_id for row in db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id != user_id,
    ).all()]
    for member_id in member_ids:
        db.add(MessageReceipt(message_id=message.id, user_id=member_id, status="sent"))
    db.commit()
    db.refresh(message)

    # 5. Update conversation timestamp
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id
    ).first()

    if conversation:
        conversation.updated_at = datetime.utcnow()
        db.commit()

    # 6. Get sender
    sender = db.query(User).filter(
        User.id == user_id
    ).first()

    return {
        "id": message.id,
        "conversation_id": message.conversation_id,
        "sender_id": message.sender_id,
        "sender_name": sender.display_name if sender else "Unknown",
        "content": message.content,
        "status": message.status,
        "receipts": [{"user_id": member_id, "status": "sent"} for member_id in member_ids],
        "created_at": message.created_at
    }
