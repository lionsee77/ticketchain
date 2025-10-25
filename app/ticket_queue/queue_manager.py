import redis
import time
from typing import Dict, Optional


# Connect to your existing Redis container (docker)
redis_client  = redis.Redis(host="redis", port=6379, decode_responses=True)

QUEUE_KEY = "ticket_queue" # List of users waiting in line
ACTIVE_KEY = "active_buyers" # Set of users currently allowed to buy
MAX_ACTIVE_BUYERS  = 10 # number of concurrent users allowed to buy


# checks if the user is currently allowed to buy
def is_allowed_entry(user_id: str) -> bool:
    return r.sismember(ACTIVE_KEY, user_id)

# def leave_queue(user_id: str):
#     """Remove user from queue or active buyers"""
#     r.lrem(QUEUE_KEY, 0, user_id)
#     r.srem(ACTIVE_KEY, user_id)
#     return {"status": "removed"}

def join_queue(user_address: str, points_redeemed: int) -> Dict:
    # Score: higher points = higher priority, subtract timestamp for tie-breaking
    timestamp = time.time()
    score = points_redeemed - (timestamp / 1e10)  # Small timestamp adjustment
    
    # Add to sorted set
    redis_client.zadd(QUEUE_KEY, {user_address: score})
    
    # Get position (1-indexed)
    position = redis_client.zrevrank(QUEUE_KEY, user_address)
    position = position + 1 if position is not None else 0
    
    # Auto-activate if slots available
    activate_next_users()
    
    return {
        "user_address": user_address,
        "queue_position": position,
        "points_redeemed": points_redeemed,
        "is_active": is_active(user_address)
    }
    
def is_active(user_address: str) -> bool:
    return redis_client.sismember(ACTIVE_KEY, user_address)


def get_position(user_address: str) -> int:
    rank = redis_client.zrevrank(QUEUE_KEY, user_address)
    return rank + 1 if rank is not None else 0

def activate_next_users() -> int:
    current_active = redis_client.scard(ACTIVE_KEY)
    slots = MAX_ACTIVE_BUYERS - current_active
    
    if slots <= 0:
        return 0
    
    # Get top users (highest scores)
    top_users = redis_client.zrevrange(QUEUE_KEY, 0, slots - 1)
    
    activated = 0
    for user in top_users:
        if not is_active(user):
            redis_client.sadd(ACTIVE_KEY, user)
            activated += 1
    
    return activated


def complete_purchase(user_address: str) -> Dict:
    redis_client.zrem(QUEUE_KEY, user_address)
    redis_client.srem(ACTIVE_KEY, user_address)
    
    # Activate next user
    activate_next_users()
    
    return {"status": "completed", "user_address": user_address}


def leave_queue(user_address: str) -> Dict:
    was_in_queue = redis_client.zrem(QUEUE_KEY, user_address)
    was_active = redis_client.srem(ACTIVE_KEY, user_address)
    
    if was_active:
        activate_next_users()
    
    return {
        "status": "removed",
        "user_address": user_address,
        "was_in_queue": bool(was_in_queue)
    }


def get_queue_stats() -> Dict:
    return {
        "queue_size": redis_client.zcard(QUEUE_KEY),
        "active_buyers": redis_client.scard(ACTIVE_KEY),
        "available_slots": MAX_ACTIVE_BUYERS - redis_client.scard(ACTIVE_KEY)
    }