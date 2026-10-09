from datetime import datetime, timedelta

from database import SessionLocal
from models import (
    User,
    Contact,
    Conversation,
    ConversationMember,
    Message,
    MessageReceipt,
)


def seed_database():

    db = SessionLocal()

    try:
        # -------------------------
        # USERS
        # -------------------------

        diya = User(
            username="diya",
            phone="9999990001",
            display_name="Diya",
            avatar_url=None,
            last_seen=datetime.utcnow()
        )

        alice = User(
            username="alice",
            phone="9999990002",
            display_name="Alice",
            avatar_url=None,
            last_seen=datetime.utcnow()
        )

        bob = User(
            username="bob",
            phone="9999990003",
            display_name="Bob",
            avatar_url=None,
            last_seen=datetime.utcnow() - timedelta(minutes=10)
        )

        charlie = User(
            username="charlie",
            phone="9999990004",
            display_name="Charlie",
            avatar_url=None,
            last_seen=datetime.utcnow() - timedelta(hours=1)
        )

        db.add_all([
            diya,
            alice,
            bob,
            charlie
        ])

        db.commit()

        # -------------------------
        # CONTACTS
        # -------------------------

        contacts = [
            Contact(
                user_id=diya.id,
                contact_id=alice.id
            ),
            Contact(
                user_id=diya.id,
                contact_id=bob.id
            ),
            Contact(
                user_id=diya.id,
                contact_id=charlie.id
            ),
        ]

        db.add_all(contacts)
        db.commit()

        # -------------------------
        # DIRECT CONVERSATION
        # Diya <-> Alice
        # -------------------------

        diya_alice = Conversation(
            type="direct",
            updated_at=datetime.utcnow() - timedelta(minutes=2)
        )

        db.add(diya_alice)
        db.commit()

        db.add_all([
            ConversationMember(
                conversation_id=diya_alice.id,
                user_id=diya.id,
                role="member"
            ),
            ConversationMember(
                conversation_id=diya_alice.id,
                user_id=alice.id,
                role="member"
            )
        ])

        db.commit()

        # Messages
        message1 = Message(
            conversation_id=diya_alice.id,
            sender_id=alice.id,
            content="Hey Diya! How are you?",
            status="read",
            created_at=datetime.utcnow() - timedelta(minutes=10)
        )

        message2 = Message(
            conversation_id=diya_alice.id,
            sender_id=diya.id,
            content="I'm good! Working on my Signal clone 😄",
            status="read",
            created_at=datetime.utcnow() - timedelta(minutes=8)
        )

        message3 = Message(
            conversation_id=diya_alice.id,
            sender_id=alice.id,
            content="That sounds cool! Good luck!",
            status="delivered",
            created_at=datetime.utcnow() - timedelta(minutes=2)
        )

        db.add_all([
            message1,
            message2,
            message3
        ])

        db.commit()

        # -------------------------
        # RECEIPTS
        # -------------------------

        db.add_all([
            MessageReceipt(
                message_id=message1.id,
                user_id=diya.id,
                status="read"
            ),
            MessageReceipt(
                message_id=message2.id,
                user_id=alice.id,
                status="read"
            ),
            MessageReceipt(
                message_id=message3.id,
                user_id=diya.id,
                status="delivered"
            )
        ])

        db.commit()

        # -------------------------
        # DIRECT CONVERSATION
        # Diya <-> Bob
        # -------------------------

        diya_bob = Conversation(
            type="direct",
            updated_at=datetime.utcnow() - timedelta(hours=1)
        )

        db.add(diya_bob)
        db.commit()

        db.add_all([
            ConversationMember(
                conversation_id=diya_bob.id,
                user_id=diya.id,
                role="member"
            ),
            ConversationMember(
                conversation_id=diya_bob.id,
                user_id=bob.id,
                role="member"
            )
        ])

        db.commit()

        bob_message = Message(
            conversation_id=diya_bob.id,
            sender_id=bob.id,
            content="Are we meeting tomorrow?",
            status="delivered",
            created_at=datetime.utcnow() - timedelta(hours=1)
        )

        db.add(bob_message)
        db.commit()

        db.add(
            MessageReceipt(
                message_id=bob_message.id,
                user_id=diya.id,
                status="delivered"
            )
        )

        db.commit()

        # -------------------------
        # GROUP
        # College Friends
        # -------------------------

        college_group = Conversation(
            type="group",
            name="College Friends",
            avatar_url=None,
            updated_at=datetime.utcnow() - timedelta(minutes=30)
        )

        db.add(college_group)
        db.commit()

        db.add_all([
            ConversationMember(
                conversation_id=college_group.id,
                user_id=diya.id,
                role="admin"
            ),
            ConversationMember(
                conversation_id=college_group.id,
                user_id=alice.id,
                role="member"
            ),
            ConversationMember(
                conversation_id=college_group.id,
                user_id=bob.id,
                role="member"
            ),
            ConversationMember(
                conversation_id=college_group.id,
                user_id=charlie.id,
                role="member"
            )
        ])

        db.commit()

        group_message1 = Message(
            conversation_id=college_group.id,
            sender_id=diya.id,
            content="Hey everyone! 👋",
            status="sent",
            created_at=datetime.utcnow() - timedelta(minutes=40)
        )

        group_message2 = Message(
            conversation_id=college_group.id,
            sender_id=alice.id,
            content="Hey! What's up?",
            status="sent",
            created_at=datetime.utcnow() - timedelta(minutes=30)
        )

        group_message3 = Message(
            conversation_id=college_group.id,
            sender_id=bob.id,
            content="Anyone free this weekend?",
            status="sent",
            created_at=datetime.utcnow() - timedelta(minutes=20)
        )

        db.add_all([
            group_message1,
            group_message2,
            group_message3
        ])

        db.commit()

        print("Database seeded successfully!")

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()