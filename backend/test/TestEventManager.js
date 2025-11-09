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
  let owner, organiser, oracle, buyer, otherUser;

  beforeEach(async function () {
    [owner, organiser, oracle, buyer, otherUser] = await ethers.getSigners();

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

    // Set oracle address
    await eventManager.setOracle(oracle.address);
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
      // Close the event first (using oracle)
      await eventManager.connect(oracle).closeEvent(1);

      const quantity = 1;
      const ticketPrice = ethers.parseEther("0.1");

      await expect(
        eventManager.connect(buyer).buyTickets(1, quantity, {
          value: ticketPrice,
        })
      ).to.be.revertedWith("Event is not active");
    });
  });

  describe("Oracle Ticket Purchasing (buyTicketsFor)", function () {
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

    it("Should allow oracle to buy tickets for a user", async function () {
      const quantity = 2;
      const ticketPrice = ethers.parseEther("0.1");
      const totalCost = ticketPrice * BigInt(quantity);

      const tx = await eventManager
        .connect(oracle)
        .buyTicketsFor(1, quantity, buyer.address, {
          value: totalCost,
        });

      await expect(tx)
        .to.emit(eventManager, "TicketsPurchased")
        .withArgs(1, buyer.address, quantity);

      // Verify event tickets sold updated
      const event = await eventManager.events(1);
      expect(event.ticketsSold).to.equal(quantity);

      // Verify NFT tickets were minted to the buyer (not oracle)
      expect(await ticketNFT.balanceOf(buyer.address)).to.equal(quantity);
      expect(await ticketNFT.balanceOf(oracle.address)).to.equal(0);
    });

    it("Should reject non-oracle from using buyTicketsFor", async function () {
      const quantity = 1;
      const ticketPrice = ethers.parseEther("0.1");

      await expect(
        eventManager.connect(buyer).buyTicketsFor(1, quantity, buyer.address, {
          value: ticketPrice,
        })
      ).to.be.revertedWith("Not the oracle");
    });

    it("Should reject buyTicketsFor with incorrect payment", async function () {
      const quantity = 1;
      const incorrectPayment = ethers.parseEther("0.05"); // Less than required

      await expect(
        eventManager.connect(oracle).buyTicketsFor(1, quantity, buyer.address, {
          value: incorrectPayment,
        })
      ).to.be.revertedWith("Incorrect Ether value sent");
    });

    it("Should reject buyTicketsFor with zero tickets", async function () {
      await expect(
        eventManager.connect(oracle).buyTicketsFor(1, 0, buyer.address, {
          value: 0,
        })
      ).to.be.revertedWith("Invalid ticket quantity");
    });

    it("Should reject buyTicketsFor when not enough tickets available", async function () {
      const quantity = 101; // More than available
      const ticketPrice = ethers.parseEther("0.1");
      const totalCost = ticketPrice * BigInt(quantity);

      await expect(
        eventManager.connect(oracle).buyTicketsFor(1, quantity, buyer.address, {
          value: totalCost,
        })
      ).to.be.revertedWith("Not enough tickets available");
    });

    it("Should reject buyTicketsFor for inactive event", async function () {
      // Close the event first
      await eventManager.connect(oracle).closeEvent(1);

      const quantity = 1;
      const ticketPrice = ethers.parseEther("0.1");

      await expect(
        eventManager.connect(oracle).buyTicketsFor(1, quantity, buyer.address, {
          value: ticketPrice,
        })
      ).to.be.revertedWith("Event is not active");
    });

    it("Should allow oracle to buy tickets for different users", async function () {
      const quantity = 1;
      const ticketPrice = ethers.parseEther("0.1");

      // Buy for buyer
      await eventManager
        .connect(oracle)
        .buyTicketsFor(1, quantity, buyer.address, {
          value: ticketPrice,
        });

      // Buy for otherUser
      await eventManager
        .connect(oracle)
        .buyTicketsFor(1, quantity, otherUser.address, {
          value: ticketPrice,
        });

      // Verify both users received their tickets
      expect(await ticketNFT.balanceOf(buyer.address)).to.equal(quantity);
      expect(await ticketNFT.balanceOf(otherUser.address)).to.equal(quantity);
      expect(await ticketNFT.balanceOf(oracle.address)).to.equal(0);

      // Verify event state
      const event = await eventManager.events(1);
      expect(event.ticketsSold).to.equal(quantity * 2);
    });

    it("Should emit correct TicketsPurchased event for buyTicketsFor", async function () {
      const quantity = 3;
      const ticketPrice = ethers.parseEther("0.1");
      const totalCost = ticketPrice * BigInt(quantity);

      await expect(
        eventManager.connect(oracle).buyTicketsFor(1, quantity, buyer.address, {
          value: totalCost,
        })
      )
        .to.emit(eventManager, "TicketsPurchased")
        .withArgs(1, buyer.address, quantity); // Event should show buyer, not oracle
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

    it("Should allow oracle to close event", async function () {
      const tx = await eventManager.connect(oracle).closeEvent(1);

      await expect(tx).to.emit(eventManager, "EventClosed").withArgs(1);

      const event = await eventManager.events(1);
      expect(event.isActive).to.equal(false);
    });

    it("Should reject non-oracle from closing event", async function () {
      await expect(
        eventManager.connect(organiser).closeEvent(1)
      ).to.be.revertedWith("Not the oracle");
    });

    it("Should reject other users from closing event", async function () {
      await expect(
        eventManager.connect(otherUser).closeEvent(1)
      ).to.be.revertedWith("Not the oracle");
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

    it("Should set oracle address", async function () {
      const newOracle = otherUser.address;

      await eventManager.setOracle(newOracle);

      expect(await eventManager.oracle()).to.equal(newOracle);
    });

    it("Should allow new oracle to close events", async function () {
      const newOracle = otherUser;

      // Set new oracle
      await eventManager.setOracle(newOracle.address);

      // Create an event
      await eventManager
        .connect(organiser)
        .createEvent(
          "Test Event",
          "Test Venue",
          Math.floor(Date.now() / 1000) + 86400,
          ethers.parseEther("0.1"),
          100
        );

      // New oracle should be able to close event
      await expect(eventManager.connect(newOracle).closeEvent(1)).to.not.be
        .reverted;

      // Old oracle should be rejected
      await expect(
        eventManager.connect(oracle).closeEvent(1)
      ).to.be.revertedWith("Not the oracle");
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

  describe("Multi-Day Events and Ticket Swapping", function () {
    let eventManager;
    let ticketNFT;
    let owner, organiser, oracle, user1, user2, user3;

    beforeEach(async function () {
      [owner, organiser, oracle, user1, user2, user3] =
        await ethers.getSigners();

      // Deploy contracts
      const TicketNFT = await ethers.getContractFactory("TicketNFT");
      ticketNFT = await TicketNFT.deploy("TicketChain", "TCT", owner.address);
      await ticketNFT.waitForDeployment();

      const EventManager = await ethers.getContractFactory("EventManager");
      eventManager = await EventManager.deploy();
      await eventManager.waitForDeployment();

      // Configure contracts
      await eventManager.setTicketNFTAddress(await ticketNFT.getAddress());
      await ticketNFT.transferOwnership(await eventManager.getAddress());
      await eventManager.setOracle(oracle.address);
    });

    describe("Multi-Day Event Creation", function () {
      it("Should create a multi-day event successfully", async function () {
        const eventName = "Summer Music Festival";
        const dates = [
          Math.floor(Date.now() / 1000) + 86400, // Day 1
          Math.floor(Date.now() / 1000) + 172800, // Day 2
          Math.floor(Date.now() / 1000) + 259200, // Day 3
        ];
        const venues = ["Main Stage", "Side Stage", "Acoustic Stage"];
        const ticketPrice = ethers.parseEther("0.1");
        const ticketsPerDay = [100, 80, 120];
        const swappableFlags = [true, true, false]; // Day 3 not swappable

        const tx = await eventManager
          .connect(organiser)
          .createMultiDayEvent(
            eventName,
            dates,
            venues,
            ticketPrice,
            ticketsPerDay,
            swappableFlags
          );

        // Check MultiDayEventCreated event
        await expect(tx)
          .to.emit(eventManager, "MultiDayEventCreated")
          .withArgs(1, eventName, organiser.address, 3);

        // Check SubEventCreated events
        await expect(tx).to.emit(eventManager, "SubEventCreated");

        // Verify parent event
        const parentEvent = await eventManager.events(1);
        expect(parentEvent.id).to.equal(1);
        expect(parentEvent.name).to.equal(eventName);
        expect(parentEvent.isMultiDay).to.equal(true);
        expect(parentEvent.totalTickets).to.equal(300); // Sum of all days

        // Verify sub-events
        const subEventIds = await eventManager.getSubEvents(1);
        expect(subEventIds.length).to.equal(3);

        // Check first sub-event details
        const subEvent1 = await eventManager.getSubEventDetails(subEventIds[0]);
        expect(subEvent1.parentEventId).to.equal(1);
        expect(subEvent1.dayIndex).to.equal(0);
        expect(subEvent1.venue).to.equal("Main Stage");
        expect(subEvent1.swappable).to.equal(true);
        expect(subEvent1.totalTickets).to.equal(100);
      });

      it("Should reject multi-day event with mismatched array lengths", async function () {
        const eventName = "Bad Festival";
        const dates = [
          Math.floor(Date.now() / 1000) + 86400,
          Math.floor(Date.now() / 1000) + 172800,
        ];
        const venues = ["Main Stage"]; // Wrong length
        const ticketPrice = ethers.parseEther("0.1");
        const ticketsPerDay = [100, 80];
        const swappableFlags = [true, true];

        await expect(
          eventManager
            .connect(organiser)
            .createMultiDayEvent(
              eventName,
              dates,
              venues,
              ticketPrice,
              ticketsPerDay,
              swappableFlags
            )
        ).to.be.revertedWith("Dates and venues length mismatch");
      });

      it("Should reject multi-day event with only one day", async function () {
        const eventName = "Single Day";
        const dates = [Math.floor(Date.now() / 1000) + 86400];
        const venues = ["Main Stage"];
        const ticketPrice = ethers.parseEther("0.1");
        const ticketsPerDay = [100];
        const swappableFlags = [true];

        await expect(
          eventManager
            .connect(organiser)
            .createMultiDayEvent(
              eventName,
              dates,
              venues,
              ticketPrice,
              ticketsPerDay,
              swappableFlags
            )
        ).to.be.revertedWith("Multi-day event requires at least 2 days");
      });
    });

    describe("Sub-Event Ticket Purchase", function () {
      let subEventIds;

      beforeEach(async function () {
        // Create a multi-day event
        const eventName = "Test Festival";
        const dates = [
          Math.floor(Date.now() / 1000) + 86400,
          Math.floor(Date.now() / 1000) + 172800,
        ];
        const venues = ["Stage A", "Stage B"];
        const ticketPrice = ethers.parseEther("0.1");
        const ticketsPerDay = [50, 60];
        const swappableFlags = [true, true];

        await eventManager
          .connect(organiser)
          .createMultiDayEvent(
            eventName,
            dates,
            venues,
            ticketPrice,
            ticketsPerDay,
            swappableFlags
          );

        subEventIds = await eventManager.getSubEvents(1);
      });

      it("Should allow buying tickets for specific sub-events", async function () {
        const quantity = 2;
        const ticketPrice = ethers.parseEther("0.1");
        const totalCost = ticketPrice * BigInt(quantity);

        // Buy tickets for day 1
        const tx = await eventManager
          .connect(user1)
          .buySubEventTickets(subEventIds[0], quantity, { value: totalCost });

        await expect(tx)
          .to.emit(eventManager, "SubEventTicketsPurchased")
          .withArgs(subEventIds[0], user1.address, quantity);

        // Verify sub-event ticket count
        const subEvent = await eventManager.getSubEventDetails(subEventIds[0]);
        expect(subEvent.ticketsSold).to.equal(quantity);

        // Verify parent event ticket count
        const parentEvent = await eventManager.events(1);
        expect(parentEvent.ticketsSold).to.equal(quantity);

        // Verify NFT balance
        expect(await ticketNFT.balanceOf(user1.address)).to.equal(quantity);
      });

      it("Should reject sub-event ticket purchase with incorrect payment", async function () {
        const quantity = 1;
        const incorrectPayment = ethers.parseEther("0.05");

        await expect(
          eventManager
            .connect(user1)
            .buySubEventTickets(subEventIds[0], quantity, {
              value: incorrectPayment,
            })
        ).to.be.revertedWith("Incorrect Ether value sent");
      });

      it("Should reject purchase when sub-event is sold out", async function () {
        const quantity = 51; // More than available for day 1 (50)
        const ticketPrice = ethers.parseEther("0.1");
        const totalCost = ticketPrice * BigInt(quantity);

        await expect(
          eventManager
            .connect(user1)
            .buySubEventTickets(subEventIds[0], quantity, { value: totalCost })
        ).to.be.revertedWith("Not enough tickets available for this day");
      });

      it("Should reject purchase for non-existent sub-event", async function () {
        const quantity = 1;
        const ticketPrice = ethers.parseEther("0.1");

        await expect(
          eventManager
            .connect(user1)
            .buySubEventTickets(999, quantity, { value: ticketPrice })
        ).to.be.revertedWith("Sub-event does not exist");
      });
    });

    describe("Ticket Swapping", function () {
      let subEventIds;
      let ticketId1, ticketId2, ticketId3, ticketId4;

      beforeEach(async function () {
        // Create a multi-day event
        const eventName = "Swap Test Festival";
        const dates = [
          Math.floor(Date.now() / 1000) + 86400,
          Math.floor(Date.now() / 1000) + 172800,
          Math.floor(Date.now() / 1000) + 259200,
        ];
        const venues = ["Stage A", "Stage B", "Stage C"];
        const ticketPrice = ethers.parseEther("0.1");
        const ticketsPerDay = [100, 100, 100];
        const swappableFlags = [true, true, false]; // Day 3 not swappable

        await eventManager
          .connect(organiser)
          .createMultiDayEvent(
            eventName,
            dates,
            venues,
            ticketPrice,
            ticketsPerDay,
            swappableFlags
          );

        subEventIds = await eventManager.getSubEvents(1);

        // Buy tickets for users
        const subEventTicketPrice = ethers.parseEther("0.1");

        // User1 gets day 1 tickets
        await eventManager
          .connect(user1)
          .buySubEventTickets(subEventIds[0], 2, {
            value: subEventTicketPrice * BigInt(2),
          });

        // User2 gets day 2 tickets
        await eventManager
          .connect(user2)
          .buySubEventTickets(subEventIds[1], 2, {
            value: subEventTicketPrice * BigInt(2),
          });

        // User3 gets day 3 tickets (non-swappable)
        await eventManager
          .connect(user3)
          .buySubEventTickets(subEventIds[2], 1, {
            value: subEventTicketPrice,
          });

        // Get ticket IDs
        ticketId1 = await ticketNFT.tokenOfOwnerByIndex(user1.address, 0); // Day 1
        ticketId2 = await ticketNFT.tokenOfOwnerByIndex(user1.address, 1); // Day 1
        ticketId3 = await ticketNFT.tokenOfOwnerByIndex(user2.address, 0); // Day 2
        ticketId4 = await ticketNFT.tokenOfOwnerByIndex(user3.address, 0); // Day 3
      });

      it("Should allow users to approve EventManager for swapping", async function () {
        // Check initial approval status
        expect(
          await eventManager.isApprovedForSwapping(user1.address)
        ).to.equal(false);

        // User1 approves EventManager (via TicketNFT)
        await ticketNFT
          .connect(user1)
          .setApprovalForAll(await eventManager.getAddress(), true);

        // Check approval status
        expect(
          await eventManager.isApprovedForSwapping(user1.address)
        ).to.equal(true);
      });

      it("Should validate ticket swap eligibility correctly", async function () {
        // Same event, different days, both swappable - should be valid
        expect(
          await eventManager.canSwapTickets(ticketId1, ticketId3)
        ).to.equal(true);

        // Same event, one day not swappable - should be invalid
        expect(
          await eventManager.canSwapTickets(ticketId1, ticketId4)
        ).to.equal(false);

        // Same day tickets - should be valid (though pointless)
        expect(
          await eventManager.canSwapTickets(ticketId1, ticketId2)
        ).to.equal(true);
      });

      it("Should perform successful ticket swap with approvals", async function () {
        // Both users approve EventManager (via TicketNFT)
        await ticketNFT
          .connect(user1)
          .setApprovalForAll(await eventManager.getAddress(), true);
        await ticketNFT
          .connect(user2)
          .setApprovalForAll(await eventManager.getAddress(), true);

        // Verify initial ownership
        expect(await ticketNFT.ownerOf(ticketId1)).to.equal(user1.address);
        expect(await ticketNFT.ownerOf(ticketId3)).to.equal(user2.address);

        // Perform swap
        const tx = await eventManager
          .connect(user1)
          .swapTickets(ticketId1, ticketId3, user1.address, user2.address);

        await expect(tx)
          .to.emit(eventManager, "TicketsSwapped")
          .withArgs(ticketId1, ticketId3, user1.address, user2.address);

        // Verify ownership changed
        expect(await ticketNFT.ownerOf(ticketId1)).to.equal(user2.address);
        expect(await ticketNFT.ownerOf(ticketId3)).to.equal(user1.address);
      });

      it("Should reject swap without proper approvals", async function () {
        // Only user1 approves, user2 doesn't (via TicketNFT)
        await ticketNFT
          .connect(user1)
          .setApprovalForAll(await eventManager.getAddress(), true);

        await expect(
          eventManager
            .connect(user1)
            .swapTickets(ticketId1, ticketId3, user1.address, user2.address)
        ).to.be.revertedWith("EventManager not approved to transfer ticket2");
      });

      it("Should reject swap from unauthorized user", async function () {
        // Both users approve (via TicketNFT)
        await ticketNFT
          .connect(user1)
          .setApprovalForAll(await eventManager.getAddress(), true);
        await ticketNFT
          .connect(user2)
          .setApprovalForAll(await eventManager.getAddress(), true);

        // User3 tries to initiate swap between user1 and user2
        await expect(
          eventManager
            .connect(user3)
            .swapTickets(ticketId1, ticketId3, user1.address, user2.address)
        ).to.be.revertedWith("Unauthorized swap");
      });

      it("Should reject swap with wrong ownership", async function () {
        await ticketNFT
          .connect(user1)
          .setApprovalForAll(await eventManager.getAddress(), true);
        await ticketNFT
          .connect(user2)
          .setApprovalForAll(await eventManager.getAddress(), true);

        // Try to swap with wrong owner addresses
        await expect(
          eventManager.connect(user1).swapTickets(
            ticketId1,
            ticketId3,
            user2.address,
            user1.address // Swapped addresses
          )
        ).to.be.revertedWith("User1 does not own ticket1");
      });

      it("Should reject swap of non-swappable tickets", async function () {
        await ticketNFT
          .connect(user1)
          .setApprovalForAll(await eventManager.getAddress(), true);
        await ticketNFT
          .connect(user3)
          .setApprovalForAll(await eventManager.getAddress(), true);

        // Try to swap day 1 ticket with day 3 ticket (day 3 not swappable)
        await expect(
          eventManager
            .connect(user1)
            .swapTickets(ticketId1, ticketId4, user1.address, user3.address)
        ).to.be.revertedWith("Ticket2's day is not swappable");
      });

      it("Should allow oracle to toggle swappable status", async function () {
        // Initially day 3 is not swappable
        const subEvent3Details = await eventManager.getSubEventDetails(
          subEventIds[2]
        );
        expect(subEvent3Details.swappable).to.equal(false);

        // Oracle makes day 3 swappable
        await eventManager
          .connect(oracle)
          .setSubEventSwappable(subEventIds[2], true);

        // Verify change
        const updatedSubEvent3 = await eventManager.getSubEventDetails(
          subEventIds[2]
        );
        expect(updatedSubEvent3.swappable).to.equal(true);

        // Now swap should work
        await ticketNFT
          .connect(user1)
          .setApprovalForAll(await eventManager.getAddress(), true);
        await ticketNFT
          .connect(user3)
          .setApprovalForAll(await eventManager.getAddress(), true);

        await expect(
          eventManager
            .connect(user1)
            .swapTickets(ticketId1, ticketId4, user1.address, user3.address)
        ).to.not.be.reverted;
      });

      it("Should reject non-oracle from changing swappable status", async function () {
        await expect(
          eventManager
            .connect(user1)
            .setSubEventSwappable(subEventIds[0], false)
        ).to.be.revertedWith("Not the oracle");
      });

      it("Should allow user2 to initiate swap as well", async function () {
        // Both users approve
        await ticketNFT
          .connect(user1)
          .setApprovalForAll(await eventManager.getAddress(), true);
        await ticketNFT
          .connect(user2)
          .setApprovalForAll(await eventManager.getAddress(), true);

        // User2 initiates the swap
        const tx = await eventManager
          .connect(user2)
          .swapTickets(ticketId1, ticketId3, user1.address, user2.address);

        await expect(tx)
          .to.emit(eventManager, "TicketsSwapped")
          .withArgs(ticketId1, ticketId3, user1.address, user2.address);
      });

      it("Should handle swap validation for regular (non-multi-day) events", async function () {
        // Create a regular single-day event
        await eventManager
          .connect(organiser)
          .createEvent(
            "Single Day Event",
            "Regular Venue",
            Math.floor(Date.now() / 1000) + 86400,
            ethers.parseEther("0.05"),
            50
          );

        // Buy tickets for the single-day event
        const singleDayTicketPrice = ethers.parseEther("0.05");
        await eventManager
          .connect(user1)
          .buyTickets(2, 1, { value: singleDayTicketPrice });
        await eventManager
          .connect(user2)
          .buyTickets(2, 1, { value: singleDayTicketPrice });

        const singleDayTicket1 = await ticketNFT.tokenOfOwnerByIndex(
          user1.address,
          2
        );
        const singleDayTicket2 = await ticketNFT.tokenOfOwnerByIndex(
          user2.address,
          2
        );

        // These tickets should be swappable (same event, no restrictions)
        expect(
          await eventManager.canSwapTickets(singleDayTicket1, singleDayTicket2)
        ).to.equal(true);

        // Cross-event swaps should not be allowed
        expect(
          await eventManager.canSwapTickets(ticketId1, singleDayTicket1)
        ).to.equal(false);
      });
    });

    describe("Helper Functions", function () {
      let subEventIds;

      beforeEach(async function () {
        // Create test events
        await eventManager
          .connect(organiser)
          .createEvent(
            "Regular Event",
            "Regular Venue",
            Math.floor(Date.now() / 1000) + 86400,
            ethers.parseEther("0.1"),
            100
          );

        await eventManager
          .connect(organiser)
          .createMultiDayEvent(
            "Multi Day Event",
            [
              Math.floor(Date.now() / 1000) + 86400,
              Math.floor(Date.now() / 1000) + 172800,
            ],
            ["Venue A", "Venue B"],
            ethers.parseEther("0.1"),
            [50, 50],
            [true, true]
          );

        subEventIds = await eventManager.getSubEvents(2);
      });

      it("Should correctly identify sub-events", async function () {
        expect(await eventManager.isSubEvent(1)).to.equal(false); // Regular event
        expect(await eventManager.isSubEvent(subEventIds[0])).to.equal(true); // Sub-event
        expect(await eventManager.isSubEvent(subEventIds[1])).to.equal(true); // Sub-event
        expect(await eventManager.isSubEvent(999)).to.equal(false); // Non-existent
      });

      it("Should correctly get parent event IDs", async function () {
        expect(await eventManager.getParentEventId(1)).to.equal(1); // Regular event is its own parent
        expect(await eventManager.getParentEventId(subEventIds[0])).to.equal(2); // Sub-event's parent
        expect(await eventManager.getParentEventId(subEventIds[1])).to.equal(2); // Sub-event's parent
      });

      it("Should return correct sub-events for parent event", async function () {
        const regularEventSubEvents = await eventManager.getSubEvents(1);
        expect(regularEventSubEvents.length).to.equal(0); // Regular event has no sub-events

        const multiDaySubEvents = await eventManager.getSubEvents(2);
        expect(multiDaySubEvents.length).to.equal(2); // Multi-day event has 2 sub-events
        expect(multiDaySubEvents[0]).to.equal(subEventIds[0]);
        expect(multiDaySubEvents[1]).to.equal(subEventIds[1]);
      });
    });
  });
});
