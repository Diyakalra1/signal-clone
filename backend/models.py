from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Text,
)
from sqlalchemy.orm import relationship

from database import Base


# =========================
# USER
# =========================

class User(Base):
    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    username = Column(
        String,
        unique=True,
        nullable=False,
        index=True
    )

    phone = Column(
        String,
        unique=True,
        nullable=True
    )

    display_name = Column(
        String,
        nullable=False
    )

    avatar_url = Column(
        String,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    last_seen = Column(
        DateTime,
        default=datetime.utcnow
    )

    # A user can send many messages
    messages = relationship(
        "Message",
        back_populates="sender"
    )

    # A user can belong to many conversations
    memberships = relationship(
        "ConversationMember",
        back_populates="user"
    )


# =========================
# CONTACT
# =========================

class Contact(Base):
    __tablename__ = "contacts"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    # The user who owns this contact
    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    # The user who has been added as a contact
    contact_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )


# =========================
# CONVERSATION
# =========================

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    # "direct" or "group"
    type = Column(
        String,
        nullable=False
    )

    # NULL for direct conversations
    name = Column(
        String,
        nullable=True
    )

    avatar_url = Column(
        String,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    # Used to sort conversations by recent activity
    updated_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    # Users participating in this conversation
    members = relationship(
        "ConversationMember",
        back_populates="conversation"
    )

    # Messages inside this conversation
    messages = relationship(
        "Message",
        back_populates="conversation"
    )


# =========================
# CONVERSATION MEMBER
# =========================

class ConversationMember(Base):
    __tablename__ = "conversation_members"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    conversation_id = Column(
        Integer,
        ForeignKey("conversations.id"),
        nullable=False
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    # "admin" or "member"
    role = Column(
        String,
        default="member"
    )

    joined_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    user = relationship(
        "User",
        back_populates="memberships"
    )

    conversation = relationship(
        "Conversation",
        back_populates="members"
    )


# =========================
# MESSAGE
# =========================

class Message(Base):
    __tablename__ = "messages"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    conversation_id = Column(
        Integer,
        ForeignKey("conversations.id"),
        nullable=False
    )

    sender_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    content = Column(
        Text,
        nullable=False
    )

    # Overall message processing state
    status = Column(
        String,
        default="sent"
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    sender = relationship(
        "User",
        back_populates="messages"
    )

    conversation = relationship(
        "Conversation",
        back_populates="messages"
    )

    # Recipient-specific delivery/read states
    receipts = relationship(
        "MessageReceipt",
        back_populates="message"
    )


# =========================
# MESSAGE RECEIPT
# =========================

class MessageReceipt(Base):
    __tablename__ = "message_receipts"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    message_id = Column(
        Integer,
        ForeignKey("messages.id"),
        nullable=False
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    # sent / delivered / read
    status = Column(
        String,
        default="sent",
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    message = relationship(
        "Message",
        back_populates="receipts"
    )

    user = relationship(
        "User"
    )


class Session(Base):
    __tablename__ = "sessions"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    session_token = Column(
        String,
        unique=True,
        nullable=False,
        index=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    expires_at = Column(
        DateTime,
        nullable=False
    )

    user = relationship(
        "User"
    )