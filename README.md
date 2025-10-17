# Ticketchain — Startup & Run Instructions

This portion of the document describes the minimal steps to start the local development environment: run a Hardhat node, deploy contracts, and start the FastAPI app that talks to the deployed contracts.

Prerequisites
- Node.js (recommended v18+), npm
- Python 3.11 (or compatible) and venv support
- Git (optional)
- MacOS terminal (commands below assume macOS)

1. Start a Hardhat local node
- Open Terminal A:
$ cd /Users/lionsee/Desktop/ticketchain/backend
$ npx hardhat node

This starts a JSON-RPC server at http://127.0.0.1:8545 and prints test accounts + private keys. Keep this terminal running.

2. Install backend deps, compile and deploy contracts
- Open Terminal B:
$ cd /Users/lionsee/Desktop/ticketchain/backend
$ npm install
$ npx hardhat compile
$ npx hardhat run scripts/deploy.js --network localhost

After successful deploy the script writes addresses to `backend/deployments/localhost.json`. Note the EventManager contract address.

3. Configure the app environment
- Create the app .env (app/ .env). Example:
RPC_URL=http://127.0.0.1:8545
EVENT_MANAGER_ADDRESS=<EventManager address from deployments/localhost.json>
ORACLE_PRIVATE_KEY=<private key for account #0 printed by the hardhat node; prefix with 0x>

Do not commit this file. Recommended:
$ cp app/.env.example app/.env
then edit app/.env.

4. Update ABIs used by the app
- From Terminal C (or B):
$ cd /Users/lionsee/Desktop/ticketchain/app
$ chmod +x update_abi.sh

5. Refer to http://127.0.0.1:8000/docs for existing list of APIs