from fastapi import APIRouter, HTTPException, Depends
from models import CreateEventRequest
from web3_manager import web3_manager

# Initialize router
router = APIRouter(prefix="/events", tags=["events"])


@router.post("/create")
async def create_event(request: CreateEventRequest):
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
