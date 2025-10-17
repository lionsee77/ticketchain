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
                event_holder.append({
                    "id": int(ev[0]),
                    "organiser": ev[1],
                    "name": ev[2],
                    "venue": ev[3],
                    "date": int(ev[4]),
                    "ticketPrice": int(ev[5]),
                    "totalTickets": int(ev[6]),
                    "ticketsSold": int(ev[7]),
                    "isActive": bool(ev[8]),
                })
            except Exception:
                continue
        return event_holder
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list ongoing events: {str(e)}")

    
@router.post("/{event_id}/close", summary="Close event (organiser/admin only)")
def close_event(event_id: int):
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
            return {"success": False, "message": "event already closed or not active", "event_id": event_id}

        # ensure oracle signer is available in web3_manager
        signer = getattr(web3_manager, "oracle_account", None) or getattr(web3_manager, "oracle_private_key", None)
        if signer is None:
            raise HTTPException(status_code=500, detail="oracle signer not configured on server")

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
        