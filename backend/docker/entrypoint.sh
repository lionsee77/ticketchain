#!/bin/sh
set -e

echo "Starting Hardhat node..."
# Enable verbose logging to see transactions and events
npx hardhat node --hostname 0.0.0.0 --config hardhat.config.docker.js --verbose &
NODE_PID=$!

# Wait until Hardhat RPC responds (instead of fixed sleep)
echo "Waiting for Hardhat node to start..."
for i in $(seq 1 15); do
  if nc -z 0.0.0.0 8545 2>/dev/null; then
    echo "Hardhat node is ready!"
    break
  fi
  echo "Waiting ($i/15)..."
  sleep 1
done

echo "Deploying contracts..."
npx hardhat run scripts/deploy.js --network localhost || {
  echo "Deployment failed."
  kill $NODE_PID
  exit 1
}

# Export contract ABI to shared volume
echo "Exporting contract ABI..."
npx hardhat run scripts/export.js --network localhost || {
  echo "Warning: ABI export failed, but continuing..."
}

# Start simple event monitoring in background
echo "Starting event monitoring..."
npx hardhat run scripts/simple-event-listener.js --network localhost &
MONITOR_PID=$!

echo "Hardhat node running on http://0.0.0.0:8545"
echo "🎧 Event monitoring active - contract events will appear above!"

# Wait for either process to exit
wait $NODE_PID
