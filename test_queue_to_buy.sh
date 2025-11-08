#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

BASE_URL="http://localhost:8000"

echo -e "${YELLOW}🚀 TICKETCHAIN END-TO-END TEST${NC}"

###############################################################################
# 1) LOGIN AS ADMIN
###############################################################################
echo -e "\n${GREEN}1) Login as admin${NC}"

ADMIN_RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
-H "Content-Type: application/json" \
-d '{"username":"admin","password":"password123"}')

ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | jq -r '.access_token')

if [[ "$ADMIN_TOKEN" == "null" || -z "$ADMIN_TOKEN" ]]; then
    echo -e "${RED}❌ Admin login failed${NC}"
    echo "$ADMIN_RESPONSE"
    exit 1
fi
echo -e "${GREEN}✅ Admin logged in${NC}"


###############################################################################
# 2) REGISTER ORGANISER
###############################################################################
echo -e "\n${GREEN}2) Register organiser${NC}"

curl -s -X POST $BASE_URL/auth/register \
-H "Content-Type: application/json" \
-d '{
  "username": "organiser",
  "email": "organiser@test.com",
  "password": "password123",
  "wallet_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "private_key": "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
}' | jq -r '.detail // "✅ organiser registered / already exists"'


###############################################################################
# 3) ASSIGN ROLE
###############################################################################
echo -e "\n${GREEN}3) Assign organiser role${NC}"

curl -s -X POST $BASE_URL/auth/assign-roles \
-H "Authorization: Bearer $ADMIN_TOKEN" \
-H "Content-Type: application/json" \
-d '{"username":"organiser","roles":["user","organiser"]}' > /dev/null

echo -e "${GREEN}✅ Role assigned${NC}"


###############################################################################
# 4) LOGIN ORGANISER
###############################################################################
echo -e "\n${GREEN}4) Login organiser${NC}"

ORG_RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
-H "Content-Type: application/json" \
-d '{"username":"organiser","password":"password123"}')

ORG_TOKEN=$(echo "$ORG_RESPONSE" | jq -r '.access_token')

if [[ "$ORG_TOKEN" == "null" || -z "$ORG_TOKEN" ]]; then
    echo -e "${RED}❌ Organiser login failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Organiser logged in${NC}"


###############################################################################
# 5) CREATE EVENT
###############################################################################
echo -e "\n${GREEN}5) Create event${NC}"

EVENT_RESPONSE=$(curl -s -X POST $BASE_URL/events/create \
-H "Authorization: Bearer $ORG_TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "name": "Test Concert 2026",
  "venue": "Test Arena",
  "date": 1792540800,
  "price": 1000000000000000,
  "total_tickets": 100
}')

echo "$EVENT_RESPONSE" | jq

EVENT_ID=$(echo "$EVENT_RESPONSE" | jq -r '.event_id // .id // 1')
echo -e "${GREEN}EVENT_ID = $EVENT_ID${NC}"


###############################################################################
# 6) REGISTER + LOGIN testuser + testuser2
###############################################################################
echo -e "\n${GREEN}6) Register + login testuser${NC}"

curl -s -X POST $BASE_URL/auth/register \
-H "Content-Type: application/json" \
-d '{
  "username":"testuser",
  "email":"testuser@test.com",
  "password":"test123",
  "wallet_address":"0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  "private_key":"0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
}' >/dev/null

TESTU_RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
-H "Content-Type: application/json" \
-d '{"username":"testuser","password":"test123"}')

TESTUSER_TOKEN=$(echo "$TESTU_RESPONSE" | jq -r '.access_token')

if [[ "$TESTUSER_TOKEN" == "null" || -z "$TESTUSER_TOKEN" ]]; then
    echo -e "${RED}❌ testuser login failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ testuser logged in${NC}"


# Second user
TEST_WALLET2="0x90F79bf6EB2c4f870365E785982E1f101E93b906"

curl -s -X POST $BASE_URL/auth/register \
-H "Content-Type: application/json" \
-d '{
  "username":"testuser2",
  "email":"testuser2@test.com",
  "password":"test123",
  "wallet_address":"'$TEST_WALLET2'",
  "private_key":"0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6"
}' >/dev/null

TESTUSER2_RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
-H "Content-Type: application/json" \
-d '{"username":"testuser2","password":"test123"}')

TESTUSER2_TOKEN=$(echo "$TESTUSER2_RESPONSE" | jq -r '.access_token')

if [[ "$TESTUSER2_TOKEN" == "null" || -z "$TESTUSER2_TOKEN" ]]; then
    echo -e "${RED}❌ testuser2 login failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ testuser2 logged in${NC}"

# user3
curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username":"user3",
    "email":"user3@test.com",
    "password":"password123",
    "wallet_address":"0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    "private_key":"0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6"
  }' >/dev/null

# user4
curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username":"user4",
    "email":"user4@test.com",
    "password":"password123",
    "wallet_address":"0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    "private_key":"0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a"
  }' >/dev/null

USER4_LOGIN_RESP=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"user4","password":"password123"}')

USER4_TOKEN=$(echo "$USER4_LOGIN_RESP" | jq -r '.access_token // empty')
if [[ -z "$USER4_TOKEN" ]]; then
  echo -e "${RED}❌ user4 login failed${NC}"
  echo "$USER4_LOGIN_RESP" | jq -C || echo "$USER4_LOGIN_RESP"
else
  echo -e "${GREEN}✅ user4 logged in${NC}"
fi

# user5
curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username":"user5",
    "email":"user5@test.com",
    "password":"password123",
    "wallet_address":"0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
    "private_key":"0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba"
  }' >/dev/null

USER5_LOGIN_RESP=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"user5","password":"password123"}')

USER5_TOKEN=$(echo "$USER5_LOGIN_RESP" | jq -r '.access_token // empty')
if [[ -z "$USER5_TOKEN" ]]; then
  echo -e "${RED}❌ user5 login failed${NC}"
  echo "$USER5_LOGIN_RESP" | jq -C || echo "$USER5_LOGIN_RESP"
else
  echo -e "${GREEN}✅ user5 logged in${NC}"
fi

# user6
curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username":"user6",
    "email":"user6@test.com",
    "password":"password123",
    "wallet_address":"0x976EA74026E726554dB657fA54763abd0C3a0aa9",
    "private_key":"0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e"
  }' >/dev/null

USER6_LOGIN_RESP=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"user6","password":"password123"}')

USER6_TOKEN=$(echo "$USER6_LOGIN_RESP" | jq -r '.access_token // empty')
if [[ -z "$USER6_TOKEN" ]]; then
  echo -e "${RED}❌ user6 login failed${NC}"
  echo "$USER6_LOGIN_RESP" | jq -C || echo "$USER6_LOGIN_RESP"
else
  echo -e "${GREEN}✅ user6 logged in${NC}"
fi

# user7
curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username":"user7",
    "email":"user7@test.com",
    "password":"password123",
    "wallet_address":"0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
    "private_key":"0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356"
  }' >/dev/null

USER7_LOGIN_RESP=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"user7","password":"password123"}')

USER7_TOKEN=$(echo "$USER7_LOGIN_RESP" | jq -r '.access_token // empty')
if [[ -z "$USER7_TOKEN" ]]; then
  echo -e "${RED}❌ user7 login failed${NC}"
  echo "$USER7_LOGIN_RESP" | jq -C || echo "$USER7_LOGIN_RESP"
else
  echo -e "${GREEN}✅ user7 logged in${NC}"
fi

# user8
curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username":"user8",
    "email":"user8@test.com",
    "password":"password123",
    "wallet_address":"0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
    "private_key":"0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97"
  }' >/dev/null

USER8_LOGIN_RESP=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"user8","password":"password123"}')

USER8_TOKEN=$(echo "$USER8_LOGIN_RESP" | jq -r '.access_token // empty')
if [[ -z "$USER8_TOKEN" ]]; then
  echo -e "${RED}❌ user8 login failed${NC}"
  echo "$USER8_LOGIN_RESP" | jq -C || echo "$USER8_LOGIN_RESP"
else
  echo -e "${GREEN}✅ user8 logged in${NC}"
fi

echo -e "\n${BLUE}queue stats${NC}"
QUEUE_STATS=$(curl -s -X GET http://localhost:8000/queue/stats)
echo "$QUEUE_STATS" | jq

###############################################################################
# 7) JOIN QUEUE — testuser
###############################################################################
echo -e "\n${GREEN}7) testuser joins queue${NC}"

QUEUE_RESPONSE=$(curl -s -X POST $BASE_URL/queue/join \
-H "Authorization: Bearer $TESTUSER_TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "user_address": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  "points_amount": 0,
  "user_account_index": 2
}')

echo "$QUEUE_RESPONSE" | jq

POSITION_RESPONSE=$(curl -s -X GET $BASE_URL/queue/position/0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC)
echo "$POSITION_RESPONSE" | jq

echo -e "\n${BLUE}queue stats${NC}"
QUEUE_STATS=$(curl -s -X GET http://localhost:8000/queue/stats)
echo "$QUEUE_STATS" | jq


###############################################################################
# 8) BUY TICKET 
###############################################################################
echo -e "\n${GREEN}8) testuser buys ticket${NC}"

BUY_RESPONSE=$(curl -s -X POST $BASE_URL/events/buy \
-H "Authorization: Bearer $TESTUSER_TOKEN" \
-H "Content-Type: application/json" \
-d "{
  \"event_id\": $EVENT_ID,
  \"quantity\": 1
}")

echo "$BUY_RESPONSE" | jq

echo -e "\n${GREEN}✅ PURCHASE DONE ${NC}"

echo -e "\n${BLUE}queue stats${NC}"
QUEUE_STATS=$(curl -s -X GET http://localhost:8000/queue/stats)
echo "$QUEUE_STATS" | jq

LEAVE_RESPONSE=$(curl -s -X POST "http://localhost:8000/queue/leave?user_address=0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC")
echo "$LEAVE_RESPONSE" | jq

echo -e "\n${BLUE}queue stats${NC}"
QUEUE_STATS=$(curl -s -X GET http://localhost:8000/queue/stats)
echo "$QUEUE_STATS" | jq
