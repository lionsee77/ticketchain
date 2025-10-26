from fastapi import APIRouter, HTTPException
from .queue_manager import (
    leave_queue,
    is_allowed_entry,
    join_queue,
    get_position,
    complete_purchase,
    get_queue_stats)
from pydantic import BaseModel

from web3_manager import web3_manager as wm

class JoinQueueRequest(BaseModel):
    user_address: str
    points_amount: int
    user_account_index: int = None  # For testing with Hardhat
    
router = APIRouter(prefix="/queue", tags=["Queue"])

@router.post("/join")
async def join_queue_endpoint(request: JoinQueueRequest):
    """
    Redeem points on blockchain and join queue.
    Users with more points get higher priority.
    """
    try:
        # Call blockchain to redeem points
        if request.user_account_index is not None:
            user_account = wm.get_user_account(request.user_account_index)
            
            # Build transaction
            tx = wm.loyalty_system.functions.redeemPointsQueue(
                wm.w3.to_checksum_address(request.user_address),
                request.points_amount
            )
            
            transaction = wm.build_user_transaction(tx, user_account)
            tx_hash = wm.sign_and_send_user_transaction(transaction, user_account)
            wm.w3.eth.wait_for_transaction_receipt(tx_hash)
        
        # Add to queue
        result = join_queue(request.user_address.lower(), request.points_amount)
        
        return {
            "success": True,
            **result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/position/{user_address}")
async def get_queue_position(user_address: str):
    """Get user's current queue position"""
    position = get_position(user_address.lower())
    active = is_allowed_entry(user_address.lower())
    
    return {
        "user_address": user_address.lower(),
        "queue_position": position,
        "can_purchase": active,
    }

@router.get("/can-purchase/{user_address}")
async def can_purchase(user_address: str):
    """Check if user can purchase tickets now"""
    return {
        "user_address": user_address,
        "can_purchase": is_allowed_entry(user_address.lower())
    }


@router.post("/complete/{user_address}")
async def complete(user_address: str):
    """Mark purchase as complete, remove from queue"""
    result = complete_purchase(user_address.lower())
    return result


@router.get("/stats")
async def stats():
    """Get queue statistics"""
    return get_queue_stats()


@router.post("/leave")
def leave(user_address: str):
    """Leave the queue"""
    return leave_queue(user_address.lower())