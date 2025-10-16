# TicketChain Smart Contracts

Blockchain backend for the TicketChain ticketing system using Hardhat.

## Quick Start

```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Start local blockchain
npx hardhat node

# Deploy contracts (new terminal)
npx hardhat run scripts/deploy.js --network localhost
```

## Contracts

| Contract       | Description                          |
| -------------- | ------------------------------------ |
| `EventManager` | Core event creation and ticket sales |
| `TicketNFT`    | ERC721 tickets with event metadata   |
| `ResaleMarket` | Secondary market with royalties      |

## Key Features

- **Oracle Pattern**: EventManager supports `buyTicketsFor()` for gasless user experience
- **NFT Tickets**: Each ticket is a unique ERC721 token
- **Resale Controls**: Price caps and royalty enforcement
- **Access Control**: Oracle-only functions for API integration

## Development

```bash
# Deploy to local network
./scripts/deploy.sh

# Run specific test file
npx hardhat test test/TestEventManager.js

# Gas reporting
REPORT_GAS=true npx hardhat test
```

## Deployment Info

After deployment, contract addresses are saved to `deployments/localhost.json` for easy integration with the FastAPI app.
