from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


# --- Event Models ---
class CreateEventRequest(BaseModel):
    name: str
    venue: str
    date: int  # Unix timestamp
    price: int  # Price in wei
    total_tickets: int


# --- Ticket Models ---


class BuyTicketsRequest(BaseModel):
    event_id: int
    quantity: int
    user_account: int  # Hardhat test account index (0-19)


# --- Market Models ---
class ListRequest(BaseModel):
    ticket_id: int
    price: int  # wei
    seller_account: int  # Hardhat test account index (0-19)


class DelistRequest(BaseModel):
    ticket_id: int
    seller_account: int  # Hardhat test account index (0-19)


class BuyListingRequest(BaseModel):
    ticket_id: int
    buyer_account: int  # Hardhat test account index (0-19)

class ListingResponse(BaseModel):
    ticket_id: int
    seller_address: str
    price: int
    event_id: int
    is_active: bool

class MarketListingsResponse(BaseModel):
    listings: list[ListingResponse]
    total: int
    message: str

# --- Approval Models ---
class ApprovalRequest(BaseModel):
    user_account: int  # Hardhat test account index (0-19)


class ApprovalStatusRequest(BaseModel):
    user_account: int  # Hardhat test account index (0-19)


# --- Auth Models ---
class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    account_index: int
    wallet_address: str
    private_key: str


class UserLogin(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    expires_in: int
    session_id: str


class TokenRefresh(BaseModel):
    refresh_token: str


class UserProfile(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str]
    is_active: bool
    is_verified: bool
    created_at: datetime
    roles: list[str]
    account_index: int
    wallet_address: str
    private_key: str  


class MessageResponse(BaseModel):
    message: str


class AssignRoleRequest(BaseModel):
    username: str
    roles: list[str]
