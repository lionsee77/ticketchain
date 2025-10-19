from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from config import config
from routes.event_route import router as event_router
from routes.market_route import router as market_router
from routes.account_route import router as account_router
from routes.loyalty_route import router as loyalty_router

app = FastAPI(
    title="TicketChain API",
    description="Blockchain-based ticket management system",
    version="1.0.0",
)

# Include routers
app.include_router(event_router)
app.include_router(market_router)
app.include_router(account_router)
app.include_router(loyalty_router)


@app.get("/")
async def root():
    return {"message": "TicketChain API is running"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
