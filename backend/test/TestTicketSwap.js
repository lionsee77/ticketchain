/* eslint-disable no-unused-vars */
const { expect } = require("chai");
const { ethers } = require("hardhat");

async function getBlockTimestamp() {
    // get the current timestamp from the blockchain
  return (await ethers.provider.getBlock("latest")).timestamp;
}

describe("TicketSwap Contract", function () {
  let ticketNFT, eventManager, ticketSwap;
  let owner, alice, bob, charlie;
  let platformFee;
  let eventId1;

  beforeEach(async function () {
    // 1. Get test accounts (signers)
    [owner, alice, bob, charlie] = await ethers.getSigners();

    // 2. Set a platform fee for testing
    platformFee = ethers.parseEther("0.01"); // 0.01 ETH

    // 3. Deploy the TicketNFT contract
    // We make the 'owner' the initial owner so we can mint tickets for testing
    const TicketNFT = await ethers.getContractFactory("TicketNFT");
    ticketNFT = await TicketNFT.deploy("TestTicket", "TKT", owner.address);

    // 4. Deploy the EventManager contract
    const EventManager = await ethers.getContractFactory("EventManager");
    eventManager = await EventManager.deploy();

    // 5. Deploy the TicketSwap contract
    const TicketSwap = await ethers.getContractFactory("TicketSwap");
    ticketSwap = await TicketSwap.deploy(
      await ticketNFT.getAddress(),
      await eventManager.getAddress(),
      platformFee,
      owner.address // The 'owner' will get the fees
    );

    // --- Setup World State ---

    // 6. Create a test event in the EventManager
    // We create an event that is 30 days in the future
    const futureTimestamp = (await getBlockTimestamp()) + 86400 * 30;
    await eventManager
      .connect(alice)
      .createEvent(
        "Test Concert",
        "Test Venue",
        futureTimestamp,
        ethers.parseEther("1"),
        100
      );
    eventId1 = 1; // This will be the ID of the event we just created

    // 7. Mint tickets directly for our test users
    // Since 'owner' deployed TicketNFT, 'owner' can mint
    // Mint Ticket ID 1 to Alice (for Event ID 1)
    await ticketNFT.connect(owner).mint(alice.address, eventId1);
    // Mint Ticket ID 2 to Bob (for Event ID 1)
    await ticketNFT.connect(owner).mint(bob.address, eventId1);
  });

  // --- Test Cases ---

  describe("Core Functionality: Offer Creation and Acceptance", function () {
    it("should allow a full, successful swap between two users", async function () {
      // --- Initial State Check ---
      expect(await ticketNFT.ownerOf(1)).to.equal(alice.address);
      expect(await ticketNFT.ownerOf(2)).to.equal(bob.address);
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

      // --- Step 1: Alice creates an offer ---
      // Alice wants to swap her Ticket #1 for Ticket #2
      // Alice must first approve the TicketSwap contract
      await ticketNFT
        .connect(alice)
        .approve(await ticketSwap.getAddress(), 1);

      // Alice creates the offer
      await expect(ticketSwap.connect(alice).createOffer(1, 2))
        .to.emit(ticketSwap, "OfferCreated")
        .withArgs(1, alice.address, 1, 2); // offerId = 1

      // Check that the offer was created correctly
      const offer = await ticketSwap.offers(1);
      expect(offer.maker).to.equal(alice.address);
      expect(offer.makerTicketId).to.equal(1);
      expect(offer.desiredTicketId).to.equal(2);
      expect(offer.active).to.be.true;

      // --- Step 2: Bob accepts the offer ---
      // Bob must first approve the TicketSwap contract
      await ticketNFT.connect(bob).approve(await ticketSwap.getAddress(), 2);

      // Bob accepts the offer and pays the platform fee
      const swapTx = await ticketSwap
        .connect(bob)
        .acceptOffer(1, { value: platformFee });

      // Check for the event
      await expect(swapTx)
        .to.emit(ticketSwap, "OfferAccepted")
        .withArgs(1, alice.address, bob.address, 1, 2);

      // --- Step 3: Verify the final state ---
      // Check that ownership has been swapped
      expect(await ticketNFT.ownerOf(1)).to.equal(bob.address);
      expect(await ticketNFT.ownerOf(2)).to.equal(alice.address);

      // Check that the offer is no longer active
      const finalOffer = await ticketSwap.offers(1);
      expect(finalOffer.active).to.be.false;
      expect(finalOffer.taker).to.equal(bob.address);

      // Check that the platform fee was collected by the contract
      expect(
        await ethers.provider.getBalance(await ticketSwap.getAddress())
      ).to.equal(platformFee);

      // Check that the owner can withdraw the fee
      await ticketSwap.connect(owner).withdrawFees();
      expect(
        await ethers.provider.getBalance(await ticketSwap.getAddress())
      ).to.equal(0);
      expect(await ethers.provider.getBalance(owner.address)).to.be.greaterThan(
        ownerBalanceBefore
      ); // Owner's balance increased (minus gas)
    });
  });

  describe("Failure Cases and Security", function () {
    it("should REVERT if a user tries to create an offer for a ticket they don't own", async function () {
      // Bob (owner of Ticket #2) tries to make an offer with Alice's Ticket #1
      await expect(
        ticketSwap.connect(bob).createOffer(1, 2)
      ).to.be.revertedWith("Not ticket owner");
    });

    it("should REVERT if a user tries to create an offer without approving the contract", async function () {
      // Alice owns Ticket #1, but forgets to call .approve()
      await expect(
        ticketSwap.connect(alice).createOffer(1, 2)
      ).to.be.revertedWith("Contract not approved to transfer your ticket");
    });

    it("should REVERT if a user tries to accept an offer with the wrong platform fee", async function () {
      // Setup the offer
      await ticketNFT
        .connect(alice)
        .approve(await ticketSwap.getAddress(), 1);
      await ticketSwap.connect(alice).createOffer(1, 2);

      // Bob approves
      await ticketNFT.connect(bob).approve(await ticketSwap.getAddress(), 2);

      // Bob tries to accept with 0 ETH
      const zeroFee = ethers.parseEther("0");
      await expect(
        ticketSwap.connect(bob).acceptOffer(1, { value: zeroFee })
      ).to.be.revertedWith("Incorrect platform fee sent");

      // Bob tries to accept with too much ETH
      const highFee = ethers.parseEther("1.0");
      await expect(
        ticketSwap.connect(bob).acceptOffer(1, { value: highFee })
      ).to.be.revertedWith("Incorrect platform fee sent");
    });

    it("should REVERT if a user tries to accept an offer they are not the taker for", async function () {
      // Mint Ticket #3 to Charlie
      await ticketNFT.connect(owner).mint(charlie.address, eventId1);

      // Setup the offer (Alice wants Ticket #2 from Bob)
      await ticketNFT
        .connect(alice)
        .approve(await ticketSwap.getAddress(), 1);
      await ticketSwap.connect(alice).createOffer(1, 2);

      // Charlie (who owns Ticket #3) tries to accept the offer
      await ticketNFT
        .connect(charlie)
        .approve(await ticketSwap.getAddress(), 3);
      await expect(
        ticketSwap.connect(charlie).acceptOffer(1, { value: platformFee })
      ).to.be.revertedWith("You do not own the desired ticket");
    });

    it("should REVERT if a user tries to accept their own offer", async function () {
      // Setup the offer
      await ticketNFT
        .connect(alice)
        .approve(await ticketSwap.getAddress(), 1);
      await ticketSwap.connect(alice).createOffer(1, 2);

      // Alice tries to accept her own offer
      await expect(
        ticketSwap.connect(alice).acceptOffer(1, { value: platformFee })
      ).to.be.revertedWith("Cannot accept your own offer");
    });

    it("should REVERT if a user tries to accept an offer but the maker sold their ticket", async function () {
      // Setup the offer
      await ticketNFT
        .connect(alice)
        .approve(await ticketSwap.getAddress(), 1);
      await ticketSwap.connect(alice).createOffer(1, 2);

      // AFTER creating the offer, Alice sells her ticket to Charlie
      await ticketNFT
        .connect(alice)
        .transferFrom(alice.address, charlie.address, 1);
      expect(await ticketNFT.ownerOf(1)).to.equal(charlie.address);

      // Bob tries to accept the now-invalid offer
      await ticketNFT.connect(bob).approve(await ticketSwap.getAddress(), 2);
      await expect(
        ticketSwap.connect(bob).acceptOffer(1, { value: platformFee })
      ).to.be.revertedWith("Offer maker no longer owns their ticket");
    });
  });
});