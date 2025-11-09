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


class CreateMultiDayEventRequest(BaseModel):
    name: str
    dates: list[int]  # List of Unix timestamps
    venues: list[str]  # List of venue names
    price: int  # Price in wei (same for all days)
    tickets_per_day: list[int]  # Number of tickets available per day
    swappable_flags: list[bool]  # Whether each day's tickets are swappable


class SubEventDetails(BaseModel):
    sub_event_id: int
    parent_event_id: int
    day_index: int
    date: int
    venue: str
    tickets_sold: int
    tickets_available: int
    swappable: bool


# --- Ticket Models ---


class BuyTicketsRequest(BaseModel):
    event_id: int
    quantity: int
    # user_account removed - get from JWT!


class BuySubEventTicketsRequest(BaseModel):
    sub_event_id: int
    quantity: int
    # user_account removed - get from JWT!


class SwapTicketsRequest(BaseModel):
    ticket_id_1: int
    ticket_id_2: int
    other_user_address: str  # Address of the other user to swap with


class CheckSwapEligibilityRequest(BaseModel):
    ticket_id_1: int
    ticket_id_2: int


class SetSubEventSwappableRequest(BaseModel):
    sub_event_id: int
    swappable: bool


# --- Market Models ---
class ListRequest(BaseModel):
    ticket_id: int
    price: int  # wei
    # seller_account removed - get from JWT!


class DelistRequest(BaseModel):
    ticket_id: int
    # seller_account removed - get from JWT!


class BuyListingRequest(BaseModel):
    ticket_id: int
    # buyer_account removed - get from JWT!


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
    pass  # user_account removed - get from JWT!


class ApprovalStatusRequest(BaseModel):
    pass  # removed user_account - get from JWT!


# --- Auth Models ---
class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: Optional[str] = None
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
    wallet_address: str
    private_key: str


class MessageResponse(BaseModel):
    message: str


class AssignRoleRequest(BaseModel):
    username: str
    roles: list[str]
