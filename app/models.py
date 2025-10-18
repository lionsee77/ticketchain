from pydantic import BaseModel

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
    price: int               # wei
    seller_account: int      # Hardhat test account index (0-19)


class DelistRequest(BaseModel):
    ticket_id: int
    seller_account: int      # Hardhat test account index (0-19)


class BuyListingRequest(BaseModel):
    ticket_id: int
    buyer_account: int       # Hardhat test account index (0-19)