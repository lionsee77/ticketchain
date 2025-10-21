from fastapi import APIRouter, HTTPException
from .queue_manager import leave_queue, is_allowed_entry

router = APIRouter(prefix="/queue", tags=["Queue"])

@router.post("/leave")
def leave(user_id: str):
    """Leave the queue"""
    return leave_queue(user_id)

@router.post("/is_allowed_entry")
def leave(user_id: str):
    """Check if allowed to buy"""
    return is_allowed_entry(user_id)