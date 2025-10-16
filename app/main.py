from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from config import config
from routes.create_event import router as create_event_router
from routes.buy_tickets import router as buy_tickets_router

app = FastAPI(
    title="TicketChain API",
    description="Blockchain-based ticket management system",
    version="1.0.0",
)

# Include routers
app.include_router(create_event_router)
app.include_router(buy_tickets_router)


@app.get("/")
async def root():
    return {"message": "TicketChain API is running"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
