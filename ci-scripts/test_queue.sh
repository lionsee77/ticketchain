#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

BASE_URL="http://localhost:8000"

echo -e "${YELLOW}🚀 TICKETCHAIN QUEUE TEST (NO POINTS)${NC}"

###############################################################################
# 1) LOGIN TEST USERS
###############################################################################
echo -e "\n${GREEN}1) Login test users${NC}"

login_user() {
  USERNAME=$1
  PASSWORD=$2
  RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

  TOKEN=$(echo "$RESPONSE" | jq -r '.access_token')

  if [[ "$TOKEN" == "null" || -z "$TOKEN" ]]; then
      echo -e "${RED}❌ Login failed for $USERNAME${NC}"
      echo "$RESPONSE"
      exit 1
  fi

  echo -e "${GREEN}✅ $USERNAME logged in${NC}"
  echo "$TOKEN"
}

TESTUSER_TOKEN=$(login_user "testuser" "test123")
TESTUSER2_TOKEN=$(login_user "testuser2" "test123")


###############################################################################
# 2) DEFINE USER ADDRESSES
###############################################################################
U1="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"  # testuser
U2="0x90F79bf6EB2c4f870365E785982E1f101E93b906"  # testuser2

echo -e "\n${GREEN}Users:${NC}"
echo "U1 = $U1"
echo "U2 = $U2"

###############################################################################
# 3) CLEAN START — LEAVE QUEUE (IGNORE ERRORS)
###############################################################################
echo -e "\n${GREEN}3) Clear queue for clean test${NC}"

curl -s -X POST $BASE_URL/queue/leave \
  -H "Content-Type: application/json" \
  -d "{\"user_address\":\"$U1\"}" >/dev/null

curl -s -X POST $BASE_URL/queue/leave \
  -H "Content-Type: application/json" \
  -d "{\"user_address\":\"$U2\"}" >/dev/null

###############################################################################
# Helpers
###############################################################################
show_stats() {
  echo -e "\n${YELLOW}📊 Queue stats:${NC}"
  curl -s $BASE_URL/queue/stats | jq
}

show_position() {
  ADDR=$1
  echo -e "\n${YELLOW}📍 Position for $ADDR:${NC}"
  curl -s $BASE_URL/queue/position/$ADDR 
}

can_purchase() {
  ADDR=$1
  echo -e "\n${YELLOW}🔎 Can purchase → $ADDR:${NC}"
  curl -s GET $BASE_URL/queue/can-purchase/$ADDR 
}

join_queue() {
  ADDR=$1
  TOKEN=$2
  echo -e "\n${GREEN}➡️  Joining queue: $ADDR${NC}"

  curl -s -X POST $BASE_URL/queue/join \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"user_address\":\"$ADDR\", \"points_amount\":0}" | jq
}

complete_purchase() {
  ADDR=$1
  echo -e "\n${GREEN}✅ Completing purchase → $ADDR${NC}"
  curl -s -X POST $BASE_URL/queue/complete/$ADDR | jq
}

leave_queue() {
  ADDR=$1
  echo -e "\n${GREEN}🚪 Leaving queue → $ADDR${NC}"
  curl -s -X POST $BASE_URL/queue/leave \
    -H "Content-Type: application/json" \
    -d "{\"user_address\":\"$ADDR\"}" | jq
}

###############################################################################
# 4) JOIN U1
###############################################################################
echo -e "\n${GREEN}4) U1 joins queue${NC}"
join_queue $U1 "$TESTUSER_TOKEN"
show_stats
show_position $U1
can_purchase $U1

###############################################################################
# 5) JOIN U2
###############################################################################
echo -e "\n${GREEN}5) U2 joins queue${NC}"
join_queue $U2 "$TESTUSER2_TOKEN"
show_stats
show_position $U1
show_position $U2

###############################################################################
# 6) CHECK CAN PURCHASE
###############################################################################
echo -e "\n${GREEN}6) Check who can purchase${NC}"
can_purchase $U1
can_purchase $U2

###############################################################################
# 7) COMPLETE PURCHASE (U1)
###############################################################################
echo -e "\n${GREEN}7) U1 completes purchase${NC}"
complete_purchase $U1
show_stats

###############################################################################
# 8) CHECK NEW POSITIONS
###############################################################################
echo -e "\n${GREEN}8) Check new positions${NC}"
show_position $U2
can_purchase $U2

###############################################################################
# 9) U2 LEAVES QUEUE
###############################################################################
echo -e "\n${GREEN}9) U2 leaves queue${NC}"
leave_queue $U2
show_stats

echo -e "\n${GREEN}✅ QUEUE TEST COMPLETED SUCCESSFULLY${NC}\n"
