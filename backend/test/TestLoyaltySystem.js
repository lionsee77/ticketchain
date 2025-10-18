const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LoyaltySystem", function () {
  let loyaltySystem;
  let loyaltyPoint;
  let owner, buyer;

  const ONE_ETH = ethers.parseEther("1");
  const CAP_PCT = 30n;

  let tokenDecimals;
  let pointsPerEther;

  beforeEach(async function () {
    [owner, organiser, buyer] = await ethers.getSigners();

    // Deploy LoyaltyPoint
    const LoyaltyPoint = await ethers.getContractFactory("LoyaltyPoint");
    loyaltyPoint = await LoyaltyPoint.deploy(owner.address, "TicketChain Points", "TCP");
    await loyaltyPoint.waitForDeployment();

    tokenDecimals = await loyaltyPoint.decimals();
    pointsPerEther = ethers.parseUnits("3000", Number(tokenDecimals));

    // Deploy LoyaltySystem
    const LoyaltySystem = await ethers.getContractFactory("LoyaltySystem");
    loyaltySystem = await LoyaltySystem.deploy(owner.address, await loyaltyPoint.getAddress(), pointsPerEther);
    await loyaltySystem.waitForDeployment();

    await (await loyaltyPoint.connect(owner).setMinter(await loyaltySystem.getAddress())).wait();
    await (await loyaltySystem.connect(owner).setSpender(owner.address, true)).wait();
  });

  it("mints points proportionally based on correct exchange rate", async () => {
    const spentWei = ethers.parseEther("0.5");
    const expectedPoints = (spentWei * pointsPerEther) / ONE_ETH;

    await (await loyaltySystem.connect(owner).awardPoints(buyer.address, spentWei)).wait();

    const bal = await loyaltyPoint.balanceOf(buyer.address);
    expect(bal).to.equal(expectedPoints);
  });

  it("mints correctly after rate change", async () => {
    const newRate = ethers.parseUnits("4000", Number(tokenDecimals));
    await (await loyaltySystem.connect(owner).setRate(newRate)).wait();

    const spentWei = ethers.parseEther("0.4");
    const expectedPoints = (spentWei * newRate) / ONE_ETH;

    await (await loyaltySystem.connect(owner).awardPoints(buyer.address, spentWei)).wait();
    const bal = await loyaltyPoint.balanceOf(buyer.address);
    expect(bal).to.equal(expectedPoints);
  });

  it("preview caps redemption at 30% (sufficient balance)", async () => {
    await (await loyaltySystem.connect(owner).awardPoints(buyer.address, ONE_ETH)).wait();

    const ticketWei = ethers.parseEther("0.4");
    const capWei = (ticketWei * CAP_PCT) / 100n;
    const capPoints = await loyaltySystem.quotePointsFromWei(capWei);

    const preview = await loyaltySystem.previewPointsAvailableForRedemption(buyer.address, ticketWei);
    expect(preview).to.equal(capPoints);
  });

  it("preview caps redemption at 30% (insufficient balance)", async () => {
    const smallEarnWei = ethers.parseEther("0.01");
    await (await loyaltySystem.connect(owner).awardPoints(buyer.address, smallEarnWei)).wait();

    const ticketWei = ethers.parseEther("0.4");
    const capWei = (ticketWei * CAP_PCT) / 100n;
    const capPoints = await loyaltySystem.quotePointsFromWei(capWei);

    const userPts = await loyaltyPoint.balanceOf(buyer.address);
    expect(userPts).to.be.lt(capPoints);

    const preview = await loyaltySystem.previewPointsAvailableForRedemption(buyer.address, ticketWei);
    expect(preview).to.equal(userPts);
  });

  it("burns loyalty points for tickets", async () => {
    const earnWei = ethers.parseEther("0.6");
    await (await loyaltySystem.connect(owner).awardPoints(buyer.address, earnWei)).wait();

    const ticketWei = ethers.parseEther("0.4");
    const capWei = (ticketWei * CAP_PCT) / 100n;
    const capPoints = await loyaltySystem.quotePointsFromWei(capWei);

    await expect(loyaltySystem.connect(owner).redeemPointsTicket(buyer.address, ticketWei)).to.be.reverted; // no allowance yet
    await (await loyaltyPoint.connect(buyer).approve(await loyaltySystem.getAddress(), capPoints)).wait();

    const expectedPointsBurned = await loyaltySystem.previewPointsAvailableForRedemption(buyer.address, ticketWei);
    expect(expectedPointsBurned).to.equal(capPoints);

    const expectedWeiDiscount = await loyaltySystem.quoteWeiFromPoints(expectedPointsBurned);
    expect(expectedWeiDiscount).to.equal(capWei);

    const balBefore = await loyaltyPoint.balanceOf(buyer.address);
    const tx = await loyaltySystem.connect(owner).redeemPointsTicket(buyer.address, ticketWei);
    await tx.wait();
    const balAfter = await loyaltyPoint.balanceOf(buyer.address);
    expect(balBefore - balAfter).to.equal(expectedPointsBurned);
  });

  it("burns loyalty points for queue priority", async () => {
    const earnWei = ethers.parseEther("0.4");
    await (await loyaltySystem.connect(owner).awardPoints(buyer.address, earnWei)).wait();

    const pointsAmt = await loyaltySystem.quotePointsFromWei(ethers.parseEther("0.05"));

    await expect(loyaltySystem.connect(owner).redeemPointsQueue(buyer.address, pointsAmt)).to.be.reverted;
    await (await loyaltyPoint.connect(buyer).approve(await loyaltySystem.getAddress(), pointsAmt)).wait();

    const balBefore = await loyaltyPoint.balanceOf(buyer.address);
    const tx = await loyaltySystem.connect(owner).redeemPointsQueue(buyer.address, pointsAmt);
    await tx.wait();

    const balAfter = await loyaltyPoint.balanceOf(buyer.address);
    expect(balBefore - balAfter).to.equal(pointsAmt);
  });
});
