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

## Troubleshooting

### "No space left on device" Error

If you encounter PostgreSQL initialization errors due to insufficient disk space:

```bash
# Stop all containers
docker compose down -v

# Clean up unused Docker images (frees significant space)
docker image prune -a -f

# Clean up build cache
docker builder prune -a -f

# Clean up unused volumes
docker volume prune -f

# Check available space
docker system df

# Start fresh
docker compose up --build
```

### Check Docker Disk Usage

```bash
# See what's taking up space
docker system df

# Get detailed breakdown
docker system df -v
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
- **LoyaltyToken** - ERC20 Loyalty Tokens
- **LoyaltySystem** - Manages awarding/usage of loyalty tokens

---

**Note:** The Docker setup uses Hardhat's test accounts for development. 

--- 

## CI/CD Pipeline

TicketChain implements a robust CI/CD workflow to ensure code quality and reliability:

### **Automated Testing**
- **Comprehensive test suite** covering authentication, event management, loyalty system, resale market, and queue management
- **Smart contract tests** using Hardhat framework for all Solidity contracts
- **Integration tests** validating end-to-end workflows across frontend, API, and blockchain
- **Automated test execution** on every pull request and push to master

### **Branch Protection & Code Review**
- **Master branch protection** - Direct commits to master are prohibited
- **Pull request requirement** - All changes must go through PR review process
- **Peer review mandatory** - At least one team member approval required before merging
- **CI status checks** - All tests must pass before PR can be merged

### **Quality Gates**
```yaml
# .github/workflows/ci.yml includes:
- Authentication & RBAC testing
- Event management validation
- Loyalty system integration tests
- Resale marketplace functionality
- Queue system and purchase protection
- Smart contract compilation and testing
```

This ensures every deployment to master is thoroughly tested and reviewed, maintaining platform stability and security.
