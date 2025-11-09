const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log(
    "Account balance:",
    (await ethers.provider.getBalance(deployer.address)).toString()
  );

  // Deploy TicketNFT contract
  console.log("\n=== Deploying TicketNFT ===");
  const TicketNFT = await ethers.getContractFactory("TicketNFT");
  const ticketNFT = await TicketNFT.deploy(
    "TicketChain NFT", // name
    "TCNFT", // symbol
    deployer.address // initial owner
  );
  await ticketNFT.waitForDeployment();
  const ticketNFTAddress = await ticketNFT.getAddress();
  console.log("TicketNFT deployed to:", ticketNFTAddress);

  // Deploy EventManager contract
  console.log("\n=== Deploying EventManager ===");
  const EventManager = await ethers.getContractFactory("EventManager");
  const eventManager = await EventManager.deploy();
  await eventManager.waitForDeployment();
  const eventManagerAddress = await eventManager.getAddress();
  console.log("EventManager deployed to:", eventManagerAddress);

  // Deploy ResaleMarket contract
  console.log("\n=== Deploying ResaleMarket ===");
  const ResaleMarket = await ethers.getContractFactory("ResaleMarket");
  const resaleMarket = await ResaleMarket.deploy(
    ticketNFTAddress, // TicketNFT contract address
    eventManagerAddress, // EventManager contract address
    11000, // resaleCapBps (110% max resale price)
    500, // royaltyBps (5% royalty)
    deployer.address // initial owner
  );
  await resaleMarket.waitForDeployment();
  const resaleMarketAddress = await resaleMarket.getAddress();
  console.log("ResaleMarket deployed to:", resaleMarketAddress);

  // Deploy LoyaltyPoint contract
  console.log("\n=== Deploying LoyaltyPoint ===");
  const LoyaltyPoint = await ethers.getContractFactory("LoyaltyPoint");
  const loyaltyPoint = await LoyaltyPoint.deploy(
    deployer.address, // initial owner
    "TicketChain Points", // name
    "TCP" // symbol
  );
  await loyaltyPoint.waitForDeployment();
  const loyaltyPointAddress = await loyaltyPoint.getAddress();
  console.log("LoyaltyPoint deployed to:", loyaltyPointAddress);

  // Deploy LoyaltySystem contract
  const pointsPerEtherHuman = process.env.POINTS_PER_ETHER || "3000";
  const tokenDecimals = await loyaltyPoint.decimals();
  const pointsPerEther = ethers.parseUnits(
    pointsPerEtherHuman.toString(),
    Number(tokenDecimals)
  );

  console.log("\n=== Deploying LoyaltySystem ===");
  const LoyaltySystem = await ethers.getContractFactory("LoyaltySystem");
  const loyaltySystem = await LoyaltySystem.deploy(
    deployer.address, // initial owner
    loyaltyPointAddress, // loyalty token
    pointsPerEther // rate: points per 1 ETH
  );
  await loyaltySystem.waitForDeployment();
  const loyaltySystemAddress = await loyaltySystem.getAddress();
  console.log("LoyaltySystem deployed to:", loyaltySystemAddress);
  console.log(`Initial rate: 1 ETH -> ${pointsPerEtherHuman} points`);

  // Set up contract connections
  console.log("\n=== Setting up contract connections ===");

  // Set TicketNFT address in EventManager
  console.log("Setting TicketNFT address in EventManager...");
  await eventManager.setTicketNFTAddress(ticketNFTAddress);
  console.log("✓ TicketNFT address set in EventManager");

  // Set EventManager as owner of TicketNFT to allow minting
  console.log("Transferring TicketNFT ownership to EventManager...");
  await ticketNFT.transferOwnership(eventManagerAddress);
  console.log("✓ TicketNFT ownership transferred to EventManager");

  // Set deployer as oracle (so the same account can call buyTicketsFor)
  console.log("Setting oracle address in EventManager...");
  await eventManager.setOracle(deployer.address);
  console.log("✓ Oracle address set to:", deployer.address);

  // Set LoyaltySystem the minter for LoyaltyPoint
  console.log("Granting LoyaltySystem minter rights on LoyaltyPoint...");
  await (await loyaltyPoint.setMinter(loyaltySystemAddress)).wait();
  console.log("✓ Minter set to:", loyaltySystemAddress);

  // Allow EventManager to trigger award/redeem in LoyaltySystem
  console.log("Authorising EventManager as spender in LoyaltySystem...");
  await (await loyaltySystem.setSpender(eventManagerAddress, true)).wait();
  console.log("✓ Spender authorised:", eventManagerAddress);

  // Allow Oracle account to trigger award/redeem in LoyaltySystem (for direct API calls)
  console.log("Authorising Oracle as spender in LoyaltySystem...");
  await (await loyaltySystem.setSpender(deployer.address, true)).wait();
  console.log("✓ Oracle spender authorised:", deployer.address);

  // Set Loyalty System in Event Manager (TODO)
  // console.log("Setting LoyaltySystem in EventManager...");
  // await (await eventManager.setLoyaltySystem(loyaltySystemAddress)).wait();
  // console.log("✓ LoyaltySystem set in EventManager");

  console.log("\n=== Deployment Summary ===");
  console.log("TicketNFT:", ticketNFTAddress);
  console.log("EventManager:", eventManagerAddress);
  console.log("ResaleMarket:", resaleMarketAddress);
  console.log("LoyaltyPoint:", loyaltyPointAddress);
  console.log("LoyaltySystem:", loyaltySystemAddress);

  // Save deployment addresses to a file for easy reference
  const deploymentInfo = {
    network: "localhost",
    deployer: deployer.address,
    contracts: {
      TicketNFT: ticketNFTAddress,
      EventManager: eventManagerAddress,
      ResaleMarket: resaleMarketAddress,
      LoyaltyPoint: loyaltyPointAddress,
      LoyaltySystem: loyaltySystemAddress
    },
    timestamp: new Date().toISOString(),
  };

  const fs = require("fs");
  const path = require("path");

  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  // Save deployment info
  fs.writeFileSync(
    path.join(deploymentsDir, "localhost.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n✓ Deployment info saved to deployments/localhost.json");
  console.log("\n🎉 All contracts deployed successfully!");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
