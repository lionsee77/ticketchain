const hre = require("hardhat");
const fs = require("fs");

async function listenForEvents() {
  console.log("🎧 Starting comprehensive event listener for all contracts...");

  try {
    // Load contract addresses
    const deploymentFile = "/app/deployments/localhost.json";
    if (!fs.existsSync(deploymentFile)) {
      console.log(
        "❌ Deployment file not found. Please deploy contracts first."
      );
      return;
    }

    const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    const provider = hre.ethers.provider;

    // Get all contract ABIs and instances
    const contracts = {};

    // EventManager
    const EventManagerABI = JSON.parse(
      fs.readFileSync(
        "/app/artifacts/contracts/EventManager.sol/EventManager.json",
        "utf8"
      )
    ).abi;
    contracts.eventManager = new hre.ethers.Contract(
      deployment.contracts.EventManager,
      EventManagerABI,
      provider
    );

    // ResaleMarket
    const ResaleMarketABI = JSON.parse(
      fs.readFileSync(
        "/app/artifacts/contracts/ResaleMarket.sol/ResaleMarket.json",
        "utf8"
      )
    ).abi;
    contracts.resaleMarket = new hre.ethers.Contract(
      deployment.contracts.ResaleMarket,
      ResaleMarketABI,
      provider
    );

    // TicketNFT
    const TicketNFTABI = JSON.parse(
      fs.readFileSync(
        "/app/artifacts/contracts/TicketNFT.sol/TicketNFT.json",
        "utf8"
      )
    ).abi;
    contracts.ticketNFT = new hre.ethers.Contract(
      deployment.contracts.TicketNFT,
      TicketNFTABI,
      provider
    );

    // LoyaltySystem
    const LoyaltySystemABI = JSON.parse(
      fs.readFileSync(
        "/app/artifacts/contracts/LoyaltySystem.sol/LoyaltySystem.json",
        "utf8"
      )
    ).abi;
    contracts.loyaltySystem = new hre.ethers.Contract(
      deployment.contracts.LoyaltySystem,
      LoyaltySystemABI,
      provider
    );

    // LoyaltyPoint
    const LoyaltyPointABI = JSON.parse(
      fs.readFileSync(
        "/app/artifacts/contracts/LoyaltyPoint.sol/LoyaltyPoint.json",
        "utf8"
      )
    ).abi;
    contracts.loyaltyPoint = new hre.ethers.Contract(
      deployment.contracts.LoyaltyPoint,
      LoyaltyPointABI,
      provider
    );

    console.log("📍 Listening to contracts:");
    console.log(`   🎪 EventManager: ${deployment.contracts.EventManager}`);
    console.log(`   🏪 ResaleMarket: ${deployment.contracts.ResaleMarket}`);
    console.log(`   🎫 TicketNFT: ${deployment.contracts.TicketNFT}`);
    console.log(`   💎 LoyaltySystem: ${deployment.contracts.LoyaltySystem}`);
    console.log(`   🪙 LoyaltyPoint: ${deployment.contracts.LoyaltyPoint}`);
    console.log("🔄 Waiting for contract events...\n");

    // Listen for EventManager events (CORRECTED SIGNATURES)
    contracts.eventManager.on("EventCreated", (eventId, name, organiser) => {
      console.log(
        `🎉 EVENT CREATED:
   Event ID: ${eventId}
   Name: ${name}
   Organiser: ${organiser}
   ---`
      );
    });

    contracts.eventManager.on(
      "MultiDayEventCreated",
      (eventId, name, organiser, numDays) => {
        console.log(
          `🗓️ MULTI-DAY EVENT CREATED:
   Event ID: ${eventId}
   Name: ${name}
   Organiser: ${organiser}
   Days: ${numDays}
   ---`
        );
      }
    );

    contracts.eventManager.on(
      "SubEventCreated",
      (subEventId, parentEventId, dayIndex) => {
        console.log(
          `📅 SUB-EVENT CREATED:
   Sub-Event ID: ${subEventId}
   Parent Event: ${parentEventId}
   Day Index: ${dayIndex}
   ---`
        );
      }
    );

    contracts.eventManager.on(
      "TicketsPurchased",
      (eventId, buyer, quantity) => {
        console.log(
          `🎫 TICKETS PURCHASED:
   Event ID: ${eventId}
   Buyer: ${buyer}
   Quantity: ${quantity}
   ---`
        );
      }
    );

    contracts.eventManager.on(
      "SubEventTicketsPurchased",
      (subEventId, buyer, quantity) => {
        console.log(
          `🎫 SUB-EVENT TICKETS PURCHASED:
   Sub-Event ID: ${subEventId}
   Buyer: ${buyer}
   Quantity: ${quantity}
   ---`
        );
      }
    );

    contracts.eventManager.on(
      "TicketsSwapped",
      (ticketId1, ticketId2, user1, user2) => {
        console.log(
          `🔄 TICKETS SWAPPED:
   Ticket 1: ${ticketId1}
   Ticket 2: ${ticketId2}
   User 1: ${user1}
   User 2: ${user2}
   ---`
        );
      }
    );

    contracts.eventManager.on("EventClosed", (eventId) => {
      console.log(
        `🔒 EVENT CLOSED:
   Event ID: ${eventId}
   ---`
      );
    });

    // Listen for ResaleMarket events
    contracts.resaleMarket.on("Listed", (ticketId, seller, price, eventId) => {
      console.log(
        `🏪 TICKET LISTED FOR SALE:
   Ticket ID: ${ticketId}
   Seller: ${seller}
   Price: ${hre.ethers.formatEther(price)} ETH
   Event ID: ${eventId}
   ---`
      );
    });

    contracts.resaleMarket.on("Delisted", (ticketId, seller) => {
      console.log(
        `❌ TICKET DELISTED:
   Ticket ID: ${ticketId}
   Seller: ${seller}
   ---`
      );
    });

    contracts.resaleMarket.on(
      "Purchased",
      (ticketId, seller, buyer, price, royalty) => {
        console.log(
          `💰 TICKET PURCHASED ON RESALE MARKET:
   Ticket ID: ${ticketId}
   Seller: ${seller}
   Buyer: ${buyer}
   Price: ${hre.ethers.formatEther(price)} ETH
   Royalty: ${hre.ethers.formatEther(royalty)} ETH
   ---`
        );
      }
    );

    // Listen for TicketNFT events
    contracts.ticketNFT.on("TicketUsed", (tokenId, user, eventId) => {
      console.log(
        `✅ TICKET USED:
   Ticket ID: ${tokenId}
   User: ${user}
   Event ID: ${eventId}
   ---`
      );
    });

    contracts.ticketNFT.on(
      "TicketSwapped",
      (oldTokenId, newTokenId, user, fromEventId, toEventId) => {
        console.log(
          `🔄 TICKET SWAPPED (NFT):
   Old Ticket: ${oldTokenId}
   New Ticket: ${newTokenId}
   User: ${user}
   From Event: ${fromEventId}
   To Event: ${toEventId}
   ---`
        );
      }
    );

    // Listen for LoyaltySystem events
    contracts.loyaltySystem.on("RateUpdated", (newRate) => {
      console.log(
        `📈 LOYALTY RATE UPDATED:
   New Rate: ${newRate}%
   ---`
      );
    });

    contracts.loyaltySystem.on("SpenderSet", (spender, allowed) => {
      console.log(
        `👤 LOYALTY SPENDER ${allowed ? "AUTHORIZED" : "DEAUTHORIZED"}:
   Spender: ${spender}
   ---`
      );
    });

    contracts.loyaltySystem.on("PointsAwarded", (user, amount, reason) => {
      console.log(
        `🎁 LOYALTY POINTS AWARDED:
   User: ${user}
   Amount: ${amount} points
   Reason: ${reason}
   ---`
      );
    });

    contracts.loyaltySystem.on(
      "PointsRedeemedTicket",
      (user, eventId, ticketQuantity, pointsSpent) => {
        console.log(
          `🎫 POINTS REDEEMED FOR TICKETS:
   User: ${user}
   Event ID: ${eventId}
   Tickets: ${ticketQuantity}
   Points Spent: ${pointsSpent}
   ---`
        );
      }
    );

    contracts.loyaltySystem.on(
      "PointsRedeemedQueue",
      (user, eventId, queuePosition, pointsSpent) => {
        console.log(
          `🏃 POINTS REDEEMED FOR QUEUE SKIP:
   User: ${user}
   Event ID: ${eventId}
   Queue Position: ${queuePosition}
   Points Spent: ${pointsSpent}
   ---`
        );
      }
    );

    // Listen for LoyaltyPoint events
    contracts.loyaltyPoint.on("MinterUpdated", (newMinter) => {
      console.log(
        `🔧 LOYALTY POINTS MINTER UPDATED:
   New Minter: ${newMinter}
   ---`
      );
    });

  } catch (error) {
    console.error("❌ Error setting up event listener:", error);
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Stopping event listener...");
  process.exit(0);
});

listenForEvents().catch(console.error);