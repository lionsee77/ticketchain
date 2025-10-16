# TicketChain FastAPI App

Backend API for the TicketChain blockchain ticketing system.

## Quick Start

```bash
# Install dependencies
uv sync

# Set up environment
cp .env.example .env

# Start local blockchain and deploy contracts(in backend/)
# See backend/README.md
# Update ABIs
./update_abi.sh

# Run API server
python main.py
```

Server runs at `http://localhost:8000` | Docs at `http://localhost:8000/docs`

## Environment Setup

| Variable                | Description                   | Default                 |
| ----------------------- | ----------------------------- | ----------------------- |
| `RPC_URL`               | Blockchain RPC endpoint       | `http://localhost:8545` |
| `ORACLE_PRIVATE_KEY`    | Oracle account private key    | Hardhat test key        |
| `EVENT_MANAGER_ADDRESS` | EventManager contract address | From deployment         |

## API Endpoints

### Events

- `POST /events/create` - Create new event
- `GET /tickets/event/{id}` - Get event details

### Tickets

- `POST /tickets/buy` - Buy tickets (oracle pays, user receives NFTs)

## Architecture

**Oracle Pattern**: API uses oracle account to sign transactions while minting tickets directly to user wallets.

- Oracle handles gas fees and transaction complexity
- Users receive ticket NFTs without needing crypto
- Single atomic transaction per purchase

## Development

```bash
# Update contract ABIs after redeployment
./update_abi.sh

# Check API documentation
curl http://localhost:8000/docs
```

**Contract Dependencies**: Requires deployed EventManager and TicketNFT contracts with oracle permissions configured.
