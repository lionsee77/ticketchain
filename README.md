# TicketChain

A blockchain-based ticket management system built with FastAPI and Ethereum smart contracts.

## Quick Start with Docker

**Prerequisites:** Docker and Docker Compose

1. **Clone and start all services:**

   ```bash
   git clone <repository-url>
   cd ticketchain
   docker compose up --build
   ```

2. **Access the services:**

   - API: http://localhost:8000
   - Blockchain RPC: http://localhost:8545
   - Redis: localhost:6380

3. **Test the API:**
   ```bash
   curl http://localhost:8000/
   ```

## Architecture

- **`/app`** - FastAPI backend API
- **`/backend`** - Hardhat blockchain with smart contracts
- **Docker Compose** - Orchestrates all services with networking

## Local Development

For local development without Docker, see individual README files:

- [App Setup](./app/README.md) - FastAPI server setup
- [Backend Setup](./backend/README.md) - Blockchain development

## API Endpoints

- `GET /` - Health check
- `POST /events/create` - Create new event
- `POST /events/{event_id}/buy` - Buy tickets

## Smart Contracts

- **EventManager** - Core event and ticket management
- **TicketNFT** - ERC721 NFT tickets
- **ResaleMarket** - Secondary ticket marketplace

---

**Note:** The Docker setup uses Hardhat's test accounts for development. 
