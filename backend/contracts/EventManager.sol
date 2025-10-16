// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface ITicketNFT {
    function mint(address to, uint256 eventId) external returns (uint256);
}

contract EventManager {
    struct Event {
        uint256 id;
        address organizer;
        string name;
        string venue;
        uint256 date;
        uint256 ticketPrice;
        uint256 totalTickets;
        uint256 ticketsSold;
        bool isActive;
    }

    mapping(uint256 => Event) public events; // eventId => Event
    uint256 public eventCounter; // Counter for event IDs
    address public ticketNFTAddress; // Address of the TicketNFT contract

    event EventCreated(uint256 eventId, string name, address organizer);
    event TicketsPurchased(uint256 eventId, address buyer, uint256 quantity);
    event EventClosed(uint256 eventId);

    // Set the TicketNFT contract address
    function setTicketNFTAddress(address _ticketNFTAddress) public {
        ticketNFTAddress = _ticketNFTAddress;
    }

    // Modifier to restrict access to event organizers
    modifier organiserOnly(uint256 eventId) {
        require(
            events[eventId].organizer == msg.sender,
            "Not the event organizer"
        );
        _;
    }

    // Create a new event
    function createEvent(
        string memory name,
        string memory venue,
        uint256 date,
        uint256 ticketPrice,
        uint256 totalTickets
    ) public {
        eventCounter++;
        events[eventCounter] = Event(
            eventCounter,
            msg.sender,
            name,
            venue,
            date,
            ticketPrice,
            totalTickets,
            0,
            true
        );

        emit EventCreated(eventCounter, name, msg.sender);
    }

    // Buy tickets for an event
    function buyTickets(uint256 eventId, uint256 quantity) public payable {
        Event storage e = events[eventId];
        require(e.isActive, "Event is not active");
        require(quantity > 0, "Invalid ticket quantity");
        require(
            e.ticketsSold + quantity <= e.totalTickets,
            "Not enough tickets available"
        );
        require(
            msg.value == e.ticketPrice * quantity,
            "Incorrect Ether value sent"
        );
        e.ticketsSold += quantity;

        // Mint tickets to the buyer
        mintTickets(eventId, quantity, msg.sender);

        emit TicketsPurchased(eventId, msg.sender, quantity);
    }

    // Mint tickets
    function mintTickets(
        uint256 eventId,
        uint256 quantity,
        address to
    ) internal {
        require(ticketNFTAddress != address(0), "TicketNFT contract not set");

        ITicketNFT ticketNFT = ITicketNFT(ticketNFTAddress);

        for (uint256 i = 0; i < quantity; i++) {
            ticketNFT.mint(to, eventId);
        }
    }

    function closeEvent(uint256 eventId) public organiserOnly(eventId) {
        Event storage e = events[eventId];
        e.isActive = false;
        emit EventClosed(eventId);
    }
}
