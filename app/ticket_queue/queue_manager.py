import redis

# Connect to your existing Redis container (docker)
r = redis.Redis(host="redis", port=6379, decode_responses=True)

QUEUE_KEY = "ticket_queue" # List of users waiting in line
ACTIVE_KEY = "active_buyers" # Set of users currently allowed to buy
MAX_ACTIVE = 10 # number of concurrent users allowed to buy


# checks if the user is currently allowed to buy
def is_allowed_entry(user_id: str) -> bool:
    return r.sismember(ACTIVE_KEY, user_id)

def leave_queue(user_id: str):
    """Remove user from queue or active buyers"""
    r.lrem(QUEUE_KEY, 0, user_id)
    r.srem(ACTIVE_KEY, user_id)
    return {"status": "removed"}