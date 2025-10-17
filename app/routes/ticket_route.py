from fastapi import APIRouter, HTTPException
from models import BuyTicketsRequest
from web3_manager import web3_manager
from web3 import Web3

# Initialize router
router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.post("/buy")
async def buy_tickets(request: BuyTicketsRequest):
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

        return {
            "success": True,
            "tx_hash": tx_hash.hex(),
            "event_id": request.event_id,
            "quantity": request.quantity,
            "total_price_wei": total_price,
            "total_price_eth": web3_manager.w3.from_wei(total_price, "ether"),
            "buyer_address": user_address,
            "user_account_index": request.user_account,
            "message": f"Successfully purchased {request.quantity} ticket(s) for event {request.event_id}. User account {request.user_account} paid and received NFTs.",
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to buy tickets: {str(e)}")


# need to implement method in event manager to mark ticket as used

# @router.post("/ticket/{ticket_id}/use", summary="Mark a ticket NFT as used (owner-only)")
# def mark_ticket_used(ticket_id: int):
#     try:
#         if not web3_manager.is_connected():
#             raise HTTPException(status_code=503, detail="Blockchain connection unavailable")

#         if ticket_id <= 0:
#             raise HTTPException(status_code=400, detail="Invalid ticket ID")
        
#     # update here

#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Failed to mark ticket as Used: {str(e)}")

