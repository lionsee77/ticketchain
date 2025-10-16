from fastapi import APIRouter, HTTPException
from models import BuyTicketsRequest
from web3_manager import web3_manager
from web3 import Web3

# Initialize router
router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.post("/buy")
async def buy_tickets(request: BuyTicketsRequest):
    try:
        # Check Web3 connection
        if not web3_manager.is_connected():
            raise HTTPException(
                status_code=503, detail="Blockchain connection unavailable"
            )

        # Validate inputs
        if request.event_id <= 0:
            raise HTTPException(status_code=400, detail="Invalid event ID")

        if request.quantity <= 0:
            raise HTTPException(
                status_code=400, detail="Quantity must be greater than 0"
            )

        if not Web3.is_address(request.buyer_address):
            raise HTTPException(status_code=400, detail="Invalid buyer address")

        # Get event details to calculate total price
        try:
            event = web3_manager.event_manager.functions.events(request.event_id).call()
            (
                event_id,
                organiser,
                name,
                venue,
                date,
                ticket_price,
                total_tickets,
                tickets_sold,
                is_active,
            ) = event
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Event not found: {str(e)}")

        # Validate event state
        if not is_active:
            raise HTTPException(status_code=400, detail="Event is not active")

        if tickets_sold + request.quantity > total_tickets:
            raise HTTPException(
                status_code=400,
                detail=f"Not enough tickets available. Only {total_tickets - tickets_sold} tickets left",
            )

        # Calculate total price
        total_price = ticket_price * request.quantity

        # Use buyTicketsFor function - oracle pays, user receives tickets directly
        function_call = web3_manager.event_manager.functions.buyTicketsFor(
            request.event_id, request.quantity, request.buyer_address
        )

        # Build and send the transaction
        txn = web3_manager.build_transaction(function_call, gas=500000)
        txn["value"] = total_price

        tx_hash = web3_manager.sign_and_send_transaction(txn)

        return {
            "success": True,
            "tx_hash": tx_hash.hex(),
            "event_id": request.event_id,
            "quantity": request.quantity,
            "total_price_wei": total_price,
            "total_price_eth": web3_manager.w3.from_wei(total_price, "ether"),
            "buyer_address": request.buyer_address,
            "oracle_address": web3_manager.oracle_account.address,
            "message": f"Successfully purchased {request.quantity} ticket(s) for event {request.event_id} and minted directly to {request.buyer_address}",
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to buy tickets: {str(e)}")


@router.get("/event/{event_id}")
async def get_event_details(event_id: int):
    """Get details of a specific event"""
    try:
        # Check Web3 connection
        if not web3_manager.is_connected():
            raise HTTPException(
                status_code=503, detail="Blockchain connection unavailable"
            )

        if event_id <= 0:
            raise HTTPException(status_code=400, detail="Invalid event ID")

        # Get event details
        try:
            event = web3_manager.event_manager.functions.events(event_id).call()
            (
                event_id_ret,
                organiser,
                name,
                venue,
                date,
                ticket_price,
                total_tickets,
                tickets_sold,
                is_active,
            ) = event
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Event not found: {str(e)}")

        return {
            "event_id": event_id_ret,
            "organiser": organiser,
            "name": name,
            "venue": venue,
            "date": date,
            "ticket_price_wei": ticket_price,
            "ticket_price_eth": web3_manager.w3.from_wei(ticket_price, "ether"),
            "total_tickets": total_tickets,
            "tickets_sold": tickets_sold,
            "tickets_available": total_tickets - tickets_sold,
            "is_active": is_active,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get event details: {str(e)}"
        )
