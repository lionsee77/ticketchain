const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TicketNFT", function () {
  let ticketNFT;
  let owner, buyer;

  beforeEach(async function () {
    [owner, buyer] = await ethers.getSigners();

    const TicketNFT = await ethers.getContractFactory("TicketNFT");
    ticketNFT = await TicketNFT.deploy("TicketChain", "TCT", owner.address);
    await ticketNFT.waitForDeployment();
  });

  it("Should mint a ticket to buyer", async function () {
    // Mint to buyer
    const tx = await ticketNFT.connect(owner).mint(buyer.address, 1);
    await tx.wait();

    console.log("Buyer balance:", await ticketNFT.balanceOf(buyer.address));

    // Verify the ticket was minted
    expect(await ticketNFT.balanceOf(buyer.address)).to.equal(1);
    expect(await ticketNFT.ticketToEvent(1)).to.equal(1);
  });
});

describe("EventManager", function () {
  let eventManager;
  let ticketNFT;
  let owner, organiser, buyer, otherUser;

  beforeEach(async function () {
    [owner, organiser, buyer, otherUser] = await ethers.getSigners();

    // Deploy TicketNFT contract
    const TicketNFT = await ethers.getContractFactory("TicketNFT");
    ticketNFT = await TicketNFT.deploy("TicketChain", "TCT", owner.address);
    await ticketNFT.waitForDeployment();

    // Deploy EventManager contract
    const EventManager = await ethers.getContractFactory("EventManager");
    eventManager = await EventManager.deploy();
    await eventManager.waitForDeployment();

    // Set the TicketNFT address in EventManager
    await eventManager.setTicketNFTAddress(await ticketNFT.getAddress());

    // Set EventManager as authorized to mint tickets
    await ticketNFT.transferOwnership(await eventManager.getAddress());
  });

  describe("Event Creation", function () {
    it("Should create a new event", async function () {
      const eventName = "Concert 2024";
      const venue = "Madison Square Garden";
      const date = Math.floor(Date.now() / 1000) + 86400; // Tomorrow
      const ticketPrice = ethers.parseEther("0.1");
      const totalTickets = 100;

      const tx = await eventManager
        .connect(organiser)
        .createEvent(eventName, venue, date, ticketPrice, totalTickets);

      await expect(tx)
        .to.emit(eventManager, "EventCreated")
        .withArgs(1, eventName, organiser.address);

      // Verify event details
      const event = await eventManager.events(1);
      expect(event.id).to.equal(1);
      expect(event.organiser).to.equal(organiser.address);
      expect(event.name).to.equal(eventName);
      expect(event.venue).to.equal(venue);
      expect(event.date).to.equal(date);
      expect(event.ticketPrice).to.equal(ticketPrice);
      expect(event.totalTickets).to.equal(totalTickets);
      expect(event.ticketsSold).to.equal(0);
      expect(event.isActive).to.equal(true);
    });

    it("Should increment event counter", async function () {
      await eventManager
        .connect(organiser)
        .createEvent(
          "Event 1",
          "Venue 1",
          Math.floor(Date.now() / 1000) + 86400,
          ethers.parseEther("0.1"),
          100
        );

      await eventManager
        .connect(organiser)
        .createEvent(
          "Event 2",
          "Venue 2",
          Math.floor(Date.now() / 1000) + 86400,
          ethers.parseEther("0.2"),
          200
        );

      expect(await eventManager.eventCounter()).to.equal(2);
    });
  });

  describe("Ticket Purchasing", function () {
    beforeEach(async function () {
      // Create an event first
      await eventManager
        .connect(organiser)
        .createEvent(
          "Test Event",
          "Test Venue",
          Math.floor(Date.now() / 1000) + 86400,
          ethers.parseEther("0.1"),
          100
        );
    });

    it("Should allow buying tickets with correct payment", async function () {
      const quantity = 2;
      const ticketPrice = ethers.parseEther("0.1");
      const totalCost = ticketPrice * BigInt(quantity);

      const tx = await eventManager.connect(buyer).buyTickets(1, quantity, {
        value: totalCost,
      });

      await expect(tx)
        .to.emit(eventManager, "TicketsPurchased")
        .withArgs(1, buyer.address, quantity);

      // Verify event tickets sold updated
      const event = await eventManager.events(1);
      expect(event.ticketsSold).to.equal(quantity);

      // Verify NFT tickets were minted
      expect(await ticketNFT.balanceOf(buyer.address)).to.equal(quantity);
    });

    it("Should reject purchase with incorrect payment", async function () {
      const quantity = 1;
      const incorrectPayment = ethers.parseEther("0.05"); // Less than required

      await expect(
        eventManager.connect(buyer).buyTickets(1, quantity, {
          value: incorrectPayment,
        })
      ).to.be.revertedWith("Incorrect Ether value sent");
    });

    it("Should reject purchase of zero tickets", async function () {
      await expect(
        eventManager.connect(buyer).buyTickets(1, 0, {
          value: 0,
        })
      ).to.be.revertedWith("Invalid ticket quantity");
    });

    it("Should reject purchase when not enough tickets available", async function () {
      const quantity = 101; // More than available
      const ticketPrice = ethers.parseEther("0.1");
      const totalCost = ticketPrice * BigInt(quantity);

      await expect(
        eventManager.connect(buyer).buyTickets(1, quantity, {
          value: totalCost,
        })
      ).to.be.revertedWith("Not enough tickets available");
    });

    it("Should reject purchase for inactive event", async function () {
      // Close the event first
      await eventManager.connect(organiser).closeEvent(1);

      const quantity = 1;
      const ticketPrice = ethers.parseEther("0.1");

      await expect(
        eventManager.connect(buyer).buyTickets(1, quantity, {
          value: ticketPrice,
        })
      ).to.be.revertedWith("Event is not active");
    });
  });

  describe("Event Management", function () {
    beforeEach(async function () {
      await eventManager
        .connect(organiser)
        .createEvent(
          "Test Event",
          "Test Venue",
          Math.floor(Date.now() / 1000) + 86400,
          ethers.parseEther("0.1"),
          100
        );
    });

    it("Should allow organiser to close their event", async function () {
      const tx = await eventManager.connect(organiser).closeEvent(1);

      await expect(tx).to.emit(eventManager, "EventClosed").withArgs(1);

      const event = await eventManager.events(1);
      expect(event.isActive).to.equal(false);
    });

    it("Should reject non-organiser from closing event", async function () {
      await expect(
        eventManager.connect(otherUser).closeEvent(1)
      ).to.be.revertedWith("Not the event organiser");
    });
  });

  describe("Contract Configuration", function () {
    it("Should set TicketNFT address", async function () {
      const newTicketNFT = await ethers.getContractFactory("TicketNFT");
      const newTicketNFTInstance = await newTicketNFT.deploy(
        "New",
        "NEW",
        owner.address
      );
      await newTicketNFTInstance.waitForDeployment();

      await eventManager.setTicketNFTAddress(
        await newTicketNFTInstance.getAddress()
      );

      expect(await eventManager.ticketNFTAddress()).to.equal(
        await newTicketNFTInstance.getAddress()
      );
    });

    it("Should reject minting when TicketNFT address not set", async function () {
      // Deploy new EventManager without setting TicketNFT address
      const EventManager = await ethers.getContractFactory("EventManager");
      const newEventManager = await EventManager.deploy();
      await newEventManager.waitForDeployment();

      // Create event
      await newEventManager
        .connect(organiser)
        .createEvent(
          "Test Event",
          "Test Venue",
          Math.floor(Date.now() / 1000) + 86400,
          ethers.parseEther("0.1"),
          100
        );

      // Try to buy tickets
      await expect(
        newEventManager.connect(buyer).buyTickets(1, 1, {
          value: ethers.parseEther("0.1"),
        })
      ).to.be.revertedWith("TicketNFT contract not set");
    });
  });
});
