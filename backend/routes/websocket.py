from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from database import SessionLocal
from models import (
    ConversationMember,
    Message,
    MessageReceipt,
    Session as DBSession,
    User,
)

router = APIRouter(tags=["WebSocket"])


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = {}
        self.conversation_connections: dict[tuple[int, int], list[WebSocket]] = {}

    async def connect(self, user_id: int, conversation_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.setdefault(user_id, []).append(websocket)
        self.conversation_connections.setdefault((conversation_id, user_id), []).append(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket):
        connections = self.active_connections.get(user_id, [])
        if websocket in connections:
            connections.remove(websocket)
        if not connections:
            self.active_connections.pop(user_id, None)
        for key, conversation_connections in list(self.conversation_connections.items()):
            if key[1] == user_id and websocket in conversation_connections:
                conversation_connections.remove(websocket)
                if not conversation_connections:
                    self.conversation_connections.pop(key, None)

    async def revoke_conversation_member(self, conversation_id: int, user_id: int):
        connections = list(self.conversation_connections.get((conversation_id, user_id), []))
        for websocket in connections:
            try:
                await websocket.send_json({
                    "type": "removed_from_conversation",
                    "data": {"conversation_id": conversation_id},
                })
                await websocket.close(code=1008, reason="Removed from conversation")
            except Exception:
                pass
            finally:
                self.disconnect(user_id, websocket)

    def online(self, user_id: int) -> bool:
        return bool(self.active_connections.get(user_id))

    async def to_user(self, user_id: int, event: dict):
        for connection in list(self.active_connections.get(user_id, [])):
            try:
                await connection.send_json(event)
            except Exception:
                self.disconnect(user_id, connection)

    async def to_members(self, user_ids: list[int], event: dict, exclude: int | None = None):
        for user_id in set(user_ids):
            if user_id != exclude:
                await self.to_user(user_id, event)


manager = ConnectionManager()


def _receipt(db, message_id: int, user_id: int):
    return db.query(MessageReceipt).filter(
        MessageReceipt.message_id == message_id,
        MessageReceipt.user_id == user_id,
    ).first()


@router.websocket("/ws/{conversation_id}")
async def websocket_endpoint(websocket: WebSocket, conversation_id: int):
    db = SessionLocal()
    user_id = None
    member_ids = []
    try:
        token = websocket.cookies.get("session_token")
        session = db.query(DBSession).filter(DBSession.session_token == token).first() if token else None
        if not session or session.expires_at < datetime.utcnow():
            await websocket.close(code=1008, reason="Not authenticated")
            return
        user_id = session.user_id
        membership = db.query(ConversationMember).filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == user_id,
        ).first()
        if not membership:
            await websocket.close(code=1008, reason="Not a conversation member")
            return

        await manager.connect(user_id, conversation_id, websocket)
        members = db.query(ConversationMember).filter(
            ConversationMember.conversation_id == conversation_id
        ).all()
        member_ids = [member.user_id for member in members]
        await manager.to_members(member_ids, {
            "type": "presence", "data": {"user_id": user_id, "online": True}
        }, exclude=user_id)
        for member_id in member_ids:
            if member_id != user_id and manager.online(member_id):
                await websocket.send_json({"type": "presence", "data": {"user_id": member_id, "online": True}})

        # A newly connected recipient has received any earlier queued messages.
        pending = db.query(Message).filter(
            Message.conversation_id == conversation_id,
            Message.sender_id != user_id,
        ).all()
        for message in pending:
            receipt = _receipt(db, message.id, user_id)
            if receipt and receipt.status == "sent":
                receipt.status = "delivered"
                receipt.updated_at = datetime.utcnow()
                await manager.to_user(message.sender_id, {
                    "type": "receipt",
                    "data": {"conversation_id": conversation_id, "message_id": message.id, "user_id": user_id, "status": "delivered"},
                })
        db.commit()

        while True:
            event = await websocket.receive_json()
            membership = db.query(ConversationMember).filter(
                ConversationMember.conversation_id == conversation_id,
                ConversationMember.user_id == user_id,
            ).first()
            if not membership:
                await websocket.send_json({
                    "type": "removed_from_conversation",
                    "data": {"conversation_id": conversation_id},
                })
                await websocket.close(code=1008, reason="No longer a conversation member")
                break
            members = db.query(ConversationMember).filter(
                ConversationMember.conversation_id == conversation_id
            ).all()
            member_ids = [member.user_id for member in members]
            event_type = event.get("type")

            if event_type == "message":
                content = str(event.get("content", "")).strip()
                if not content:
                    continue
                if len(content) > 10000:
                    await websocket.send_json({"type": "error", "message": "Messages are limited to 10,000 characters."})
                    continue

                message = Message(
                    conversation_id=conversation_id,
                    sender_id=user_id,
                    content=content,
                    status="sent",
                )
                db.add(message)
                db.flush()
                recipient_states = []
                delivered_any = False
                for member_id in member_ids:
                    if member_id == user_id:
                        continue
                    state = "delivered" if manager.online(member_id) else "sent"
                    delivered_any = delivered_any or state == "delivered"
                    db.add(MessageReceipt(
                        message_id=message.id,
                        user_id=member_id,
                        status=state,
                        updated_at=datetime.utcnow(),
                    ))
                    recipient_states.append({"user_id": member_id, "status": state})
                if delivered_any:
                    message.status = "delivered"
                conversation = message.conversation
                conversation.updated_at = datetime.utcnow()
                sender = db.query(User).filter(User.id == user_id).first()
                db.commit()
                db.refresh(message)
                payload = {
                    "id": message.id,
                    "conversation_id": conversation_id,
                    "sender_id": user_id,
                    "sender_name": sender.display_name if sender else "Unknown",
                    "content": message.content,
                    "status": message.status,
                    "receipts": recipient_states,
                    "created_at": message.created_at.isoformat(),
                }
                await manager.to_members(member_ids, {"type": "message", "data": payload})

            elif event_type == "typing":
                await manager.to_members(member_ids, {
                    "type": "typing",
                    "data": {"conversation_id": conversation_id, "user_id": user_id, "typing": bool(event.get("typing"))},
                }, exclude=user_id)

            elif event_type == "read":
                unread = db.query(Message).filter(
                    Message.conversation_id == conversation_id,
                    Message.sender_id != user_id,
                ).all()
                read_ids = []
                for message in unread:
                    receipt = _receipt(db, message.id, user_id)
                    if not receipt:
                        receipt = MessageReceipt(message_id=message.id, user_id=user_id, status="read")
                        db.add(receipt)
                    elif receipt.status != "read":
                        receipt.status = "read"
                        receipt.updated_at = datetime.utcnow()
                    read_ids.append(message.id)
                db.commit()
                if read_ids:
                    await manager.to_members(member_ids, {
                        "type": "read",
                        "data": {"conversation_id": conversation_id, "message_ids": read_ids, "user_id": user_id, "status": "read"},
                    }, exclude=user_id)

    except WebSocketDisconnect:
        pass
    finally:
        if user_id is not None:
            manager.disconnect(user_id, websocket)
            if not manager.online(user_id):
                await manager.to_members(member_ids, {
                    "type": "presence", "data": {"user_id": user_id, "online": False}
                })
        db.close()
