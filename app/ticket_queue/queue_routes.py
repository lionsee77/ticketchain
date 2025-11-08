from fastapi import APIRouter, HTTPException
from .queue_manager import (
    leave_queue,
    is_allowed_purchased,
    join_queue,
    get_position,
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
    Optionally redeem loyalty points then join queue.
    Users with more points get higher priority.
    """
    try:
        user_address = request.user_address.lower()
        pts = int(request.points_amount or 0)

        # ✅ If redeem requested (points_amount > 0)
        if pts > 0:

            # ✅ Check user balance before redeem
            try:
                balance = wm.get_points_balance(user_address)
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Unable to fetch loyalty balance: {e}"
                )

            if balance < pts:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient loyalty balance. Have {balance}, need {pts}"
                )

            # ✅ If user_account_index provided → redeem via Hardhat account
            if request.user_account_index is not None:
                try:
                    # Use the account-by-index helper for Hardhat test accounts
                    user_account = wm.get_user_account_by_index(request.user_account_index)

                    tx = wm.loyalty_system.functions.redeemPointsQueue(
                        wm.w3.to_checksum_address(user_address),
                        pts
                    )

                    transaction = wm.build_user_transaction(tx, user_account)
                    tx_hash = wm.sign_and_send_user_transaction(transaction, user_account)

                    wm.w3.eth.wait_for_transaction_receipt(tx_hash)

                except Exception as e:
                    raise HTTPException(
                        status_code=500,
                        detail=f"Failed to redeem points on chain: {str(e)}"
                    )

            # If account index not provided → only priority weight used
            # (No blockchain redeem triggered)

        # ✅ Add to local queue
        result = join_queue(user_address, pts)

        return {
            "success": True,
            **result
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/position/{user_address}")
async def get_queue_position(user_address: str):
    """Get user's current queue position"""
    position = get_position(user_address.lower())
    active = is_allowed_purchased(user_address.lower())
    
    return {
        "user_address": user_address.lower(),
        "queue_position": position,
        "can_purchase": active
    }

@router.get("/can-purchase/{user_address}")
async def can_purchase(user_address: str):
    """Check if user can purchase tickets now"""
    return {
        "user_address": user_address,
        "can_purchase": is_allowed_purchased(user_address.lower())
    }


# @router.post("/complete/{user_address}")
# async def complete(user_address: str):
#     """Mark purchase as complete, remove from queue"""
#     result = complete_purchase(user_address.lower())
#     return result


@router.get("/stats")
async def stats():
    """Get queue statistics"""
    return get_queue_stats()


@router.post("/leave")
def leave(user_address: str):
    """Leave the queue"""
    return leave_queue(user_address.lower())