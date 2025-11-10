from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import logging
import threading
import time
import redis

from config import config
from routes.event_route import router as event_router
from routes.market_route import router as market_router
from routes.account_route import router as account_router
from routes.loyalty_route import router as loyalty_router
from routes.auth_route import router as auth_router
from ticket_queue.queue_routes import router as queue_router
from ticket_queue.queue_manager import activate_next_users
from routes.ticket_route import router as ticket_router
from middleware.auth import AuthMiddleware
from database.db import engine, Base

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="TicketChain API",
    description="Blockchain-based ticket management system with authentication",
    version="1.0.0",
)

def background_activation_loop():
    """Continuously activate next users every few seconds."""
    for _ in range(5):
        try:
            activated = activate_next_users()
            logger.info("[Queue] Redis connection established, activation loop starting.")
            break
        except redis.exceptions.ConnectionError:
            logger.warning("Redis not ready, retrying...")
            time.sleep(2)
    else:
        logger.error("[Queue] Failed to connect to Redis after 5 attempts, continuing anyway.")

    while True:
        try:
            activated = activate_next_users()
            if activated > 0:
                logger.info(f"[Queue] Activated {activated} new user(s).")
        except Exception as e:
            logger.error(f"[Queue] Activation error: {e}")
        time.sleep(5)


@app.on_event("startup")
async def startup_event():
    """Application startup event - seed roles and perform other initialization"""
    logger.info("🚀 Starting TicketChain API...")
    logger.info("✅ Application startup completed!")

    """Start background activation loop on app startup."""
    def start_loop():
        time.sleep(2)  # Give Redis a second to be ready
        background_activation_loop()

    thread = threading.Thread(target=start_loop, daemon=True)
    thread.start()
    logger.info("✅ Background queue activation loop started.")


@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown event"""
    logger.info("⏹️ Shutting down TicketChain API...")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add authentication middleware (token verification only)
app.add_middleware(
    AuthMiddleware,
    protected_paths={
        "/events",
        "/market",
        "/loyalty",
        "/tickets",
        "/auth/profile",
        "/auth/me",
        "/auth/logout",
        "/auth/logout-all",
    },
)

# Include routers
app.include_router(auth_router)
app.include_router(event_router)
app.include_router(market_router)
app.include_router(account_router)
app.include_router(queue_router)
app.include_router(loyalty_router)
app.include_router(ticket_router)


@app.get("/")
async def root():
    return {"message": "TicketChain API is running"}


@app.options("/{path:path}")
async def handle_options(path: str):
    """Handle all OPTIONS requests for CORS preflight"""
    return {"message": "CORS preflight"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
