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

- `POST /events/create` - Create new event (oracle only)
- `GET /tickets/event/{id}` - Get event details

### Tickets

- `POST /tickets/buy` - Buy tickets (user pays directly, receives NFTs)
- `GET /tickets/accounts` - View Hardhat test account balances

## Architecture

**User-Direct Payment**: Users pay with their own ETH and receive ticket NFTs directly.

- Each user uses a Hardhat test account (index 0-9)
- Users pay ticket costs + gas fees from their account
- NFTs are minted directly to user's wallet
- Single atomic transaction per purchase

### Test Account Usage

Available accounts: 0-9 (each starts with 10,000 ETH)

```bash
# User account 1 buys 2 tickets
curl -X POST "http://localhost:8000/tickets/buy" \
  -H "Content-Type: application/json" \
  -d '{"event_id": 1, "quantity": 2, "user_account": 1}'

# Check account balances
curl http://localhost:8000/tickets/accounts
```

**Note**: Account 0 is reserved for oracle operations (event creation).

## Development

```bash
# Update contract ABIs after redeployment
./update_abi.sh

# Check API documentation
curl http://localhost:8000/docs

# Monitor user balances during testing
curl http://localhost:8000/tickets/accounts | jq '.accounts[] | {index, balance_eth}'
```

**Contract Dependencies**: Requires deployed EventManager and TicketNFT contracts. Oracle account (index 0) needs permissions for event creation.
