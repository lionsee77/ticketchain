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

        # Validate user account index
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


@router.get("/accounts")
async def get_test_accounts():
    """Get Hardhat test account information for development"""
    try:
        accounts_info = []
        for i in range(10):  # Show first 10 accounts
            address = web3_manager.get_user_address(i)
            balance = web3_manager.get_account_balance(address)
            balance_eth = web3_manager.w3.from_wei(balance, "ether")

            accounts_info.append(
                {
                    "index": i,
                    "address": address,
                    "balance_wei": balance,
                    "balance_eth": float(balance_eth),
                }
            )

        return {
            "accounts": accounts_info,
            "network": "localhost:8545",
            "note": "These are Hardhat test accounts for development only",
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get account info: {str(e)}"
        )
