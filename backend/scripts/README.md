# Deployment Scripts

This directory contains scripts for deploying your TicketChain smart contracts.

## Files

- `deploy.js` - Main deployment script for all contracts
- `deploy.sh` - Bash script wrapper for easy deployment
- `../deployments/` - Directory where deployment addresses are saved

## Quick Start

### 1. Start Local Hardhat Network

In one terminal, start the local blockchain:

```bash
npx hardhat node
```

This will start a local Ethereum network on `http://localhost:8545` with 20 test accounts pre-funded with 10,000 ETH each.

### 2. Deploy Contracts

In another terminal, run the deployment:

```bash
# Option 1: Use the bash script
./scripts/deploy.sh

# Option 2: Run directly with hardhat
npx hardhat run scripts/deploy.js --network localhost
```

## What Gets Deployed

The deployment script will deploy the following contracts in order:

1. **TicketNFT** - ERC721 contract for ticket NFTs
2. **EventManager** - Main contract for creating and managing events
3. **ResaleMarket** - Marketplace for reselling tickets

### Contract Setup

The script also configures the contracts:

- Sets the TicketNFT address in EventManager
- Transfers TicketNFT ownership to EventManager (so it can mint tickets)
- Configures ResaleMarket with 110% max resale price and 5% royalty

## Deployment Output

After successful deployment, you'll find:

- Console output with all contract addresses
- `deployments/localhost.json` file with deployment info

### Sample deployment info:

```json
{
  "network": "localhost",
  "deployer": "0x...",
  "contracts": {
    "TicketNFT": "0x...",
    "EventManager": "0x...",
    "ResaleMarket": "0x..."
  },
  "timestamp": "2025-10-16T..."
}
```

## Using Deployed Contracts

After deployment, you can:

1. Import the contract addresses into your frontend app
2. Use the addresses to interact with the contracts via Web3/Ethers.js
3. Test the contracts using the Hardhat console or your test suite

## Troubleshooting

### "Cannot resolve network localhost"

Make sure the Hardhat node is running first:

```bash
npx hardhat node
```

### "Insufficient funds"

The deployer account should have enough ETH. The local network provides test accounts with 10,000 ETH each.

### "Contract not deployed"

Check the console output for any error messages during deployment. Make sure all dependencies are installed:

```bash
npm install
```
