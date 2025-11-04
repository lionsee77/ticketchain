#!/bin/bash

GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}🧪 Quick JWT Marketplace Test${NC}"

# Login users
echo "1. Login testuser..."
TOKEN1=$(curl -s -X POST http://localhost:8000/auth/login -H "Content-Type: application/json" -d '{"username": "testuser", "password": "test123"}' | jq -r '.access_token')

echo "2. Login testuser2..." 
TOKEN2=$(curl -s -X POST http://localhost:8000/auth/login -H "Content-Type: application/json" -d '{"username": "testuser2", "password": "test123"}' | jq -r '.access_token')

# testuser lists their ticket #1
echo "3. testuser lists ticket #1..."
curl -s -X POST http://localhost:8000/market/list -H "Authorization: Bearer $TOKEN1" -H "Content-Type: application/json" -d '{"ticket_id": 1, "price": 2}' | jq

# Check active listings
echo "4. Check active listings..."
curl -s -X GET http://localhost:8000/market/listings -H "Authorization: Bearer $TOKEN2" | jq

# testuser2 buys the listing
echo "5. testuser2 buys ticket #1..."
curl -s -X POST http://localhost:8000/market/buy -H "Authorization: Bearer $TOKEN2" -H "Content-Type: application/json" -d '{"ticket_id": 1}' | jq

echo -e "${GREEN}✅ Quick test complete${NC}"
