from pydantic import BaseModel


class CreateEventRequest(BaseModel):
    name: str
    venue: str
    date: int  # Unix timestamp
    price: int  # Price in wei
    total_tickets: int


class BuyTicketsRequest(BaseModel):
    event_id: int
    quantity: int
    buyer_address: str  # Address of the ticket buyer
