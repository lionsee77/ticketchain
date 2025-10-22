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

   - Frontend: http://localhost:3000
   - API: http://localhost:8000
   - Blockchain RPC: http://localhost:8545
   - Redis: localhost:6380

3. **Test the API:**
   ```bash
   curl http://localhost:8000/
   ```

## Database Reset (Fresh Start)

To completely reset the database and start with fresh data:
This will:
- Remove all user accounts (except admin/organiser which are auto-created)
- Clear all events, tickets, and marketplace listings
- Reset blockchain state (all accounts get fresh 10,000 ETH)
- Recreate admin and organiser accounts with default passwords

```bash
# Stop all containers and remove volumes (clears database)
docker compose down -v

# Remove any persistent volumes
docker volume prune -f

# Start fresh with clean database
docker compose up --build
```

## Default accounts
-- Admin account
- **`username`** : admin
- **`password`** : password123

-- Organiser account -> to create events
- **`username`** : organiser
- **`password`** : password123

When registering new test users, ensure you do not reuse Wallet Address



## Architecture

- **`/app`** - FastAPI backend API
- **`/backend`** - Hardhat blockchain with smart contracts
- **`/frontend`** - NEXT.js web application
- **Docker Compose** - Orchestrates all services with networking

## Local Development

For local development without Docker, see individual README files:

- [App Setup](./app/README.md) - FastAPI server setup
- [Backend Setup](./backend/README.md) - Blockchain development

## Smart Contracts

- **EventManager** - Core event and ticket management
- **TicketNFT** - ERC721 NFT tickets
- **ResaleMarket** - Secondary ticket marketplace

---

**Note:** The Docker setup uses Hardhat's test accounts for development. 

