from fastapi import APIRouter, HTTPException, Depends
from models import CreateEventRequest, BuyTicketsRequest
from web3_manager import web3_manager
from dependencies.role_deps import (
    require_authenticated_user,
    require_roles,
)

# Initialize router
router = APIRouter(prefix="/events", tags=["events"])


@router.post("/create")
# requires Unix timestamp obtain via CLI -> date -j -f "%d%m%Y" "20102026" "+%s"
async def create_event(
    request: CreateEventRequest,
    user_info: dict = Depends(
        require_roles(
            ["admin", "organiser"]
        ),  # Authorization: admin or organiser roles required
    ),
):
    """Create a new event - requires admin or organiser role"""
    try:
        # Check Web3 connection
        if not web3_manager.is_connected():
            raise HTTPException(
                status_code=503, detail="Blockchain connection unavailable"
            )

        # Validate inputs
        if not request.name.strip():
            raise HTTPException(status_code=400, detail="Event name cannot be empty")

        if not request.venue.strip():
            raise HTTPException(status_code=400, detail="Venue cannot be empty")

        if request.date <= 0:
            raise HTTPException(status_code=400, detail="Invalid date")

        if request.price <= 0:
            raise HTTPException(status_code=400, detail="Price must be greater than 0")

        if request.total_tickets <= 0:
            raise HTTPException(
                status_code=400, detail="Total tickets must be greater than 0"
            )

        # Build transaction using web3_manager
        function_call = web3_manager.event_manager.functions.createEvent(
            request.name,
            request.venue,
            request.date,
            request.price,
            request.total_tickets,
        )

        txn = web3_manager.build_transaction(function_call)
        tx_hash = web3_manager.sign_and_send_transaction(txn)

        return {
            "success": True,
            "tx_hash": tx_hash.hex(),
            "message": f"Event '{request.name}' created successfully",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create event: {str(e)}")

@router.get("/all", summary="List all events")
async def fetch_all_events():
    try:
        # Check Web3 connection
        if not web3_manager.is_connected():
            raise HTTPException(
                status_code=503, detail="Blockchain connection unavailable"
            )
        total_num_of_events = web3_manager.event_manager.functions.eventCounter().call()
        event_holder = []
        for i in range(1, total_num_of_events + 1):
            try:
                ev = web3_manager.event_manager.functions.events(i).call()
                event_holder.append(
                    {
                        "id": int(ev[0]),
                        "organiser": ev[1],
                        "name": ev[2],
                        "venue": ev[3],
                        "date": int(ev[4]),
                        "ticketPrice": int(ev[5]),
                        "totalTickets": int(ev[6]),
                        "ticketsSold": int(ev[7]),
                        "isActive": bool(ev[8]),
                    }
                )
            except Exception:
                continue
        return event_holder

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to list ongoing events: {str(e)}"
        )


@router.post("/{event_id}/close", summary="Close event (organiser/admin only)")
def close_event(
    event_id: int, user_info: dict = Depends(require_roles(["admin", "organiser"]))
):
    try:
        # Check Web3 connection
        if not web3_manager.is_connected():
            raise HTTPException(
                status_code=503, detail="Blockchain connection unavailable"
            )

        total_num_of_events = web3_manager.event_manager.functions.eventCounter().call()
        if event_id <= 0 or event_id > total_num_of_events:
            raise HTTPException(status_code=400, detail="Invalid eventID")

        is_active = web3_manager.event_manager.functions.eventIsActive(event_id).call()
        if not is_active:
            return {
                "success": False,
                "message": "event already closed or not active",
                "event_id": event_id,
            }

        # ensure oracle signer is available in web3_manager
        signer = getattr(web3_manager, "oracle_account", None) or getattr(
            web3_manager, "oracle_private_key", None
        )
        if signer is None:
            raise HTTPException(
                status_code=500, detail="oracle signer not configured on server"
            )

        # build, sign and send tx
        try:
            fn_call = web3_manager.event_manager.functions.closeEvent(event_id)
            txn = web3_manager.build_transaction(fn_call)
            tx_hash = web3_manager.sign_and_send_transaction(txn)

            return {
                "success": True,
                "tx_hash": tx_hash.hex(),
                "message": f"Event '{event_id}' closed successfully",
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"failed to send tx: {e}")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to close events: {str(e)}")


@router.get("/{event_id}/details", summary="Get event details")
async def get_event_details(event_id: int):
    """Get details of a specific event"""
    try:
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


@router.post("/buy", summary="Buy fresh tickets from event organiser")
async def buy_tickets(
    request: BuyTicketsRequest,
    user_info: dict = Depends(
        require_authenticated_user
    ),  # Authentication required, any role
):
    """Buy tickets - requires authentication but any role is allowed"""
    try:
        if not web3_manager.is_connected():
            raise HTTPException(
                status_code=503, detail="Blockchain connection unavailable"
            )

        if request.event_id <= 0:
            raise HTTPException(status_code=400, detail="Invalid event ID")

        if request.quantity <= 0:
            raise HTTPException(
                status_code=400, detail="Quantity must be greater than 0"
            )

        if request.user_account not in range(10):  # 0-9
            raise HTTPException(status_code=400, detail="User account must be 0-9")

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

        # Get user account for this purchase
        user_account = web3_manager.get_user_account(request.user_account)
        user_address = user_account.address

        # Check user has enough ETH
        user_balance = web3_manager.get_account_balance(user_address)
        if user_balance < total_price:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient balance. Need {web3_manager.w3.from_wei(total_price, 'ether')} ETH, have {web3_manager.w3.from_wei(user_balance, 'ether')} ETH",
            )

        # Use regular buyTickets function - user pays and receives tickets directly
        function_call = web3_manager.event_manager.functions.buyTickets(
            request.event_id, request.quantity
        )

        # Build and send the transaction from user account
        txn = web3_manager.build_user_transaction(
            function_call, user_account, gas=500000
        )
        txn["value"] = total_price

        tx_hash = web3_manager.sign_and_send_user_transaction(txn, user_account)

        # Award loyalty points after successful ticket purchase
        loyalty_points_awarded = 0
        try:
            loyalty_points_awarded = web3_manager.award_loyalty_points(user_address, total_price)
        except Exception as e:
            # Log the error but don't fail the ticket purchase
            print(f"Warning: Failed to award loyalty points: {str(e)}")

        return {
            "success": True,
            "tx_hash": tx_hash.hex(),
            "event_id": request.event_id,
            "quantity": request.quantity,
            "total_price_wei": total_price,
            "total_price_eth": web3_manager.w3.from_wei(total_price, "ether"),
            "buyer_address": user_address,
            "user_account_index": request.user_account,
            "loyalty_points_awarded": loyalty_points_awarded,
            "message": f"Successfully purchased {request.quantity} ticket(s) for event {request.event_id}. User account {request.user_account} paid and received NFTs. Awarded {loyalty_points_awarded} loyalty points.",
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to buy tickets: {str(e)}")
