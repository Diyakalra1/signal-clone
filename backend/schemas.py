from pydantic import BaseModel


class RegisterRequest(BaseModel):
    username: str | None = None
    phone: str | None = None
    display_name: str | None = None
    avatar_url: str | None = None


class VerifyOTPRequest(BaseModel):
    username: str | None = None
    phone: str | None = None
    otp: str
    display_name: str | None = None
    avatar_url: str | None = None



class LoginRequest(BaseModel):
    username: str | None = None
    phone: str | None = None
    otp: str


class OTPRequest(BaseModel):
    username: str | None = None
    phone: str | None = None


class ProfileUpdateRequest(BaseModel):
    display_name: str | None = None
    avatar_url: str | None = None


class ContactCreateRequest(BaseModel):
    username: str | None = None
    phone: str | None = None


class DirectConversationRequest(BaseModel):
    contact_id: int


class GroupCreateRequest(BaseModel):
    name: str
    member_ids: list[int] = []


class GroupMemberRequest(BaseModel):
    user_id: int


class UserResponse(BaseModel):
    id: int
    username: str
    phone: str | None
    display_name: str
    avatar_url: str | None

    class Config:
        from_attributes = True
class SendMessageRequest(BaseModel):
    content: str
