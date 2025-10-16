const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("ResaleMarket", function () {
  let resaleMarket;
  let ticketNFT;
  let eventManager;
  let owner, organiser, oracle, seller, buyer, otherUser;

  const RESALE_CAP_BPS = 11000; // 110%
  const ROYALTY_BPS = 500; // 5%
  const TICKET_PRICE = ethers.parseEther("0.1");
  const RESALE_PRICE = ethers.parseEther("0.11"); // 110% of original

  beforeEach(async function () {
    [owner, organiser, oracle, seller, buyer, otherUser] =
      await ethers.getSigners();

    // Deploy TicketNFT contract
    const TicketNFT = await ethers.getContractFactory("TicketNFT");
    ticketNFT = await TicketNFT.deploy("TicketChain", "TCT", owner.address);
    await ticketNFT.waitForDeployment();

    // Deploy EventManager contract
    const EventManager = await ethers.getContractFactory("EventManager");
    eventManager = await EventManager.deploy();
    await eventManager.waitForDeployment();

    // Set up the contracts connection
    await eventManager.setTicketNFTAddress(await ticketNFT.getAddress());
    await ticketNFT.transferOwnership(await eventManager.getAddress());

    // Set oracle for event management
    await eventManager.setOracle(oracle.address);

    // Deploy ResaleMarket contract
    const ResaleMarket = await ethers.getContractFactory("ResaleMarket");
    resaleMarket = await ResaleMarket.deploy(
      await ticketNFT.getAddress(),
      await eventManager.getAddress(),
      RESALE_CAP_BPS,
      ROYALTY_BPS,
      owner.address
    );
    await resaleMarket.waitForDeployment();

    // Create an event
    const futureDate = Math.floor(Date.now() / 1000) + 86400; // Tomorrow
    await eventManager
      .connect(organiser)
      .createEvent("Test Concert", "Test Venue", futureDate, TICKET_PRICE, 100);

    // Buy tickets for seller to resell
    await eventManager.connect(seller).buyTickets(1, 2, {
      value: TICKET_PRICE * 2n,
    });

    // Approve resale market to transfer tickets
    await ticketNFT
      .connect(seller)
      .setApprovalForAll(await resaleMarket.getAddress(), true);
  });

  describe("Deployment", function () {
    it("Should set the correct initial values", async function () {
      expect(await resaleMarket.ticket()).to.equal(
        await ticketNFT.getAddress()
      );
      expect(await resaleMarket.manager()).to.equal(
        await eventManager.getAddress()
      );
      expect(await resaleMarket.resaleCapBps()).to.equal(RESALE_CAP_BPS);
      expect(await resaleMarket.royaltyBps()).to.equal(ROYALTY_BPS);
      expect(await resaleMarket.owner()).to.equal(owner.address);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to set resale cap", async function () {
      const newCap = 12000; // 120%
      await resaleMarket.connect(owner).setResaleCapBps(newCap);
      expect(await resaleMarket.resaleCapBps()).to.equal(newCap);
    });

    it("Should allow owner to set royalty rate", async function () {
      const newRoyalty = 1000; // 10%
      await resaleMarket.connect(owner).setRoyaltyBps(newRoyalty);
      expect(await resaleMarket.royaltyBps()).to.equal(newRoyalty);
    });

    it("Should reject non-owner from setting resale cap", async function () {
      await expect(
        resaleMarket.connect(seller).setResaleCapBps(12000)
      ).to.be.revertedWithCustomError(
        resaleMarket,
        "OwnableUnauthorizedAccount"
      );
    });

    it("Should reject non-owner from setting royalty rate", async function () {
      await expect(
        resaleMarket.connect(seller).setRoyaltyBps(1000)
      ).to.be.revertedWithCustomError(
        resaleMarket,
        "OwnableUnauthorizedAccount"
      );
    });
  });

  describe("Listing Tickets", function () {
    it("Should allow ticket owner to list a ticket", async function () {
      const ticketId = 1;

      const tx = await resaleMarket
        .connect(seller)
        .list(ticketId, RESALE_PRICE);

      await expect(tx)
        .to.emit(resaleMarket, "Listed")
        .withArgs(ticketId, seller.address, RESALE_PRICE, 1);

      const listing = await resaleMarket.listings(ticketId);
      expect(listing.seller).to.equal(seller.address);
      expect(listing.price).to.equal(RESALE_PRICE);
      expect(listing.eventId).to.equal(1);
      expect(listing.active).to.equal(true);
    });

    it("Should reject listing by non-owner", async function () {
      const ticketId = 1;

      await expect(
        resaleMarket.connect(buyer).list(ticketId, RESALE_PRICE)
      ).to.be.revertedWith("Not ticket owner");
    });

    it("Should reject listing with zero price", async function () {
      const ticketId = 1;

      await expect(
        resaleMarket.connect(seller).list(ticketId, 0)
      ).to.be.revertedWith("Price must be positive");
    });

    it("Should reject listing above price cap", async function () {
      const ticketId = 1;
      const overPricedTicket = ethers.parseEther("0.15"); // 150% of original

      await expect(
        resaleMarket.connect(seller).list(ticketId, overPricedTicket)
      ).to.be.revertedWith("Price exceeds cap");
    });

    it("Should allow listing when resale cap is disabled", async function () {
      // Set resale cap to 0 (disabled)
      await resaleMarket.connect(owner).setResaleCapBps(0);

      const ticketId = 1;
      const highPrice = ethers.parseEther("1.0"); // 1000% of original

      await expect(resaleMarket.connect(seller).list(ticketId, highPrice)).to
        .not.be.reverted;
    });

    it("Should reject listing for inactive event", async function () {
      // Close the event (using oracle)
      await eventManager.connect(oracle).closeEvent(1);

      const ticketId = 1;

      await expect(
        resaleMarket.connect(seller).list(ticketId, RESALE_PRICE)
      ).to.be.revertedWith("Event not active");
    });
  });

  describe("Delisting Tickets", function () {
    beforeEach(async function () {
      // List a ticket first
      await resaleMarket.connect(seller).list(1, RESALE_PRICE);
    });

    it("Should allow seller to delist their ticket", async function () {
      const ticketId = 1;

      const tx = await resaleMarket.connect(seller).delist(ticketId);

      await expect(tx)
        .to.emit(resaleMarket, "Delisted")
        .withArgs(ticketId, seller.address);

      const listing = await resaleMarket.listings(ticketId);
      expect(listing.active).to.equal(false);
    });

    it("Should reject delisting by non-seller", async function () {
      const ticketId = 1;

      await expect(
        resaleMarket.connect(buyer).delist(ticketId)
      ).to.be.revertedWith("Not the seller");
    });

    it("Should reject delisting inactive listing", async function () {
      const ticketId = 2; // Not listed

      await expect(
        resaleMarket.connect(seller).delist(ticketId)
      ).to.be.revertedWith("Listing not active");
    });
  });

  describe("Buying Tickets", function () {
    beforeEach(async function () {
      // List a ticket first
      await resaleMarket.connect(seller).list(1, RESALE_PRICE);
    });

    it("Should allow buying a listed ticket", async function () {
      const ticketId = 1;
      const expectedRoyalty = (RESALE_PRICE * BigInt(ROYALTY_BPS)) / 10000n;
      const sellerAmount = RESALE_PRICE - expectedRoyalty;

      const sellerBalanceBefore = await ethers.provider.getBalance(
        seller.address
      );
      const organiserBalanceBefore = await ethers.provider.getBalance(
        organiser.address
      );

      const tx = await resaleMarket.connect(buyer).buy(ticketId, {
        value: RESALE_PRICE,
      });

      await expect(tx)
        .to.emit(resaleMarket, "Purchased")
        .withArgs(
          ticketId,
          seller.address,
          buyer.address,
          RESALE_PRICE,
          expectedRoyalty
        );

      // Check NFT ownership transferred
      expect(await ticketNFT.ownerOf(ticketId)).to.equal(buyer.address);

      // Check listing was removed
      const listing = await resaleMarket.listings(ticketId);
      expect(listing.active).to.equal(false);

      // Check payment distribution
      const sellerBalanceAfter = await ethers.provider.getBalance(
        seller.address
      );
      const organiserBalanceAfter = await ethers.provider.getBalance(
        organiser.address
      );

      expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(sellerAmount);
      expect(organiserBalanceAfter - organiserBalanceBefore).to.equal(
        expectedRoyalty
      );
    });

    it("Should reject purchase with incorrect price", async function () {
      const ticketId = 1;
      const wrongPrice = ethers.parseEther("0.05");

      await expect(
        resaleMarket.connect(buyer).buy(ticketId, { value: wrongPrice })
      ).to.be.revertedWith("Incorrect price");
    });

    it("Should reject seller buying their own ticket", async function () {
      const ticketId = 1;

      await expect(
        resaleMarket.connect(seller).buy(ticketId, { value: RESALE_PRICE })
      ).to.be.revertedWith("Cannot buy your own ticket");
    });

    it("Should reject purchase of inactive listing", async function () {
      const ticketId = 2; // Not listed

      await expect(
        resaleMarket.connect(buyer).buy(ticketId, { value: RESALE_PRICE })
      ).to.be.revertedWith("Listing not active");
    });

    it("Should handle zero royalty when royalty is disabled", async function () {
      // Set royalty to 0
      await resaleMarket.connect(owner).setRoyaltyBps(0);

      const ticketId = 1;
      // Relist with new royalty settings
      await resaleMarket.connect(seller).delist(ticketId);
      await resaleMarket.connect(seller).list(ticketId, RESALE_PRICE);

      const sellerBalanceBefore = await ethers.provider.getBalance(
        seller.address
      );
      const organiserBalanceBefore = await ethers.provider.getBalance(
        organiser.address
      );

      await resaleMarket.connect(buyer).buy(ticketId, {
        value: RESALE_PRICE,
      });

      const sellerBalanceAfter = await ethers.provider.getBalance(
        seller.address
      );
      const organiserBalanceAfter = await ethers.provider.getBalance(
        organiser.address
      );

      // Seller should receive full amount, organiser should receive nothing
      expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(RESALE_PRICE);
      expect(organiserBalanceAfter - organiserBalanceBefore).to.equal(0);
    });

    it("Should reject purchase after event ends", async function () {
      const ticketId = 1;

      // Get current time snapshot
      const currentTime = await time.latest();

      // Fast forward time to after event end
      await time.increaseTo(currentTime + 86500);

      await expect(
        resaleMarket.connect(buyer).buy(ticketId, { value: RESALE_PRICE })
      ).to.be.revertedWith("Event already ended");
    });
  });

  describe("Edge Cases", function () {
    // Create a fresh event for edge case tests to avoid time conflicts
    beforeEach(async function () {
      // Create a new event with a future date for these tests
      const futureDate = (await time.latest()) + 172800; // 2 days from now
      await eventManager
        .connect(organiser)
        .createEvent(
          "Edge Case Event",
          "Test Venue",
          futureDate,
          TICKET_PRICE,
          100
        );

      // Buy tickets for the new event (eventId 2)
      await eventManager.connect(seller).buyTickets(2, 2, {
        value: TICKET_PRICE * 2n,
      });
    });

    it("Should handle multiple listings and purchases", async function () {
      // Use tickets from the new event (tokenIds 3 and 4)
      await resaleMarket.connect(seller).list(3, RESALE_PRICE);
      await resaleMarket.connect(seller).list(4, RESALE_PRICE);

      // Buy both tickets
      await resaleMarket.connect(buyer).buy(3, { value: RESALE_PRICE });
      await resaleMarket.connect(otherUser).buy(4, { value: RESALE_PRICE });

      expect(await ticketNFT.ownerOf(3)).to.equal(buyer.address);
      expect(await ticketNFT.ownerOf(4)).to.equal(otherUser.address);
    });

    it("Should reject purchase if seller no longer owns ticket", async function () {
      const ticketId = 3;

      // List the ticket
      await resaleMarket.connect(seller).list(ticketId, RESALE_PRICE);

      // Transfer ticket to someone else
      await ticketNFT
        .connect(seller)
        .transferFrom(seller.address, otherUser.address, ticketId);

      await expect(
        resaleMarket.connect(buyer).buy(ticketId, { value: RESALE_PRICE })
      ).to.be.revertedWith("Seller no longer owns ticket");
    });

    it("Should work with different resale cap percentages", async function () {
      // Test with 200% cap
      await resaleMarket.connect(owner).setResaleCapBps(20000);

      const highPrice = ethers.parseEther("0.2"); // 200% of original

      await expect(resaleMarket.connect(seller).list(4, highPrice)).to.not.be
        .reverted;
    });
  });
});
