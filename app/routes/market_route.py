from fastapi import APIRouter, HTTPException
from models import BuyTicketsRequest
from web3_manager import web3_manager
from web3 import Web3

# Initialize router
router = APIRouter(prefix="/market", tags=["market"])





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

