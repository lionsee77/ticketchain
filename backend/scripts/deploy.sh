#!/bin/bash

# Script to deploy contracts to local Hardhat network

echo "Starting deployment to local Hardhat network..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "node_modules not found. Please run 'npm install' first."
    exit 1
fi

# Run the deployment script
npx hardhat run scripts/deploy.js --network localhost

echo "Next steps:"
echo "   1. Make sure Hardhat node is running: npx hardhat node"
echo "   2. Check deployment info in: deployments/localhost.json"
echo "   3. Import contract addresses to your frontend/app"