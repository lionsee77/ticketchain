#!/bin/bash

# Script to update contract ABIs in the Python app after compilation

echo "🔄 Updating contract ABIs..."
echo ""

# Check if we're in the correct directory structure
if [ ! -d "../backend/artifacts" ] && [ ! -d "backend/artifacts" ]; then
    echo "❌ Error: Cannot find backend/artifacts directory"
    echo "   Please run this script from the app directory or root project directory"
    exit 1
fi

# Determine paths based on current directory
if [ -d "backend/artifacts" ]; then
    # Running from project root
    BACKEND_DIR="backend"
    APP_DIR="app"
else
    # Running from app directory
    BACKEND_DIR="../backend"
    APP_DIR="."
fi

echo "📁 Backend directory: $BACKEND_DIR"
echo "📁 App directory: $APP_DIR"
echo ""

# Function to update ABI
update_abi() {
    local contract_name=$1
    local source_file="$BACKEND_DIR/artifacts/contracts/$contract_name.sol/$contract_name.json"
    local dest_file="$APP_DIR/${contract_name}ABI.json"
    
    echo "🔍 Updating $contract_name ABI..."
    
    if [ ! -f "$source_file" ]; then
        echo "❌ Source file not found: $source_file"
        echo "   Please compile contracts first: cd $BACKEND_DIR && npx hardhat compile"
        return 1
    fi
    
    # Extract ABI using Python
    python3 -c "
import json
import sys

try:
    # Read the full compiled contract artifact
    with open('$source_file', 'r') as f:
        full_artifact = json.load(f)
    
    # Extract just the ABI
    abi = full_artifact.get('abi', [])
    
    if not abi:
        print('❌ No ABI found in artifact file')
        sys.exit(1)
    
    # Write the ABI to the app directory
    with open('$dest_file', 'w') as f:
        json.dump(abi, f, indent=2)
    
    print(f'✅ {len(abi)} functions/events extracted to $dest_file')
    
except Exception as e:
    print(f'❌ Error processing ABI: {e}')
    sys.exit(1)
"
    
    if [ $? -eq 0 ]; then
        echo "✅ $contract_name ABI updated successfully"
        return 0
    else
        echo "❌ Failed to update $contract_name ABI"
        return 1
    fi
}

# Update EventManager ABI
update_abi "EventManager"
echo ""

# Update TicketNFT ABI (optional)
echo "🔍 Checking for TicketNFT ABI..."
if [ -f "$BACKEND_DIR/artifacts/contracts/TicketNFT.sol/TicketNFT.json" ]; then
    update_abi "TicketNFT"
else
    echo "ℹ️  TicketNFT ABI not found, skipping..."
fi
echo ""

# Update ResaleMarket ABI (optional)
echo "🔍 Checking for ResaleMarket ABI..."
if [ -f "$BACKEND_DIR/artifacts/contracts/ResaleMarket.sol/ResaleMarket.json" ]; then
    update_abi "ResaleMarket"
else
    echo "ℹ️  ResaleMarket ABI not found, skipping..."
fi
echo ""

echo "🎉 ABI update completed!"
echo ""
echo "📋 Next steps:"
echo "   1. If your Python app is running, it should auto-reload with the new ABIs"
echo "   2. If not, restart your Python app: python main.py"
echo "   3. Test your API endpoints to ensure they work with updated ABIs"