// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface ITicketNFT {
    function mint(address to, uint256 eventId) external returns (uint256);

    function mintForSubEvent(
        address to,
        uint256 eventId,
        uint256 subEventId
    ) external returns (uint256);

    function markAsUsed(uint256 ticketId) external;

    function isUsed(uint256 ticketId) external view returns (bool);

    function ticketToEvent(uint256 ticketId) external view returns (uint256);

    function getSubEventId(uint256 ticketId) external view returns (uint256);

    function ownerOf(uint256 tokenId) external view returns (address);

    function balanceOf(address owner) external view returns (uint256);

    function tokenOfOwnerByIndex(
        address owner,
        uint256 index
    ) external view returns (uint256);

    function transferFrom(address from, address to, uint256 tokenId) external;

    function approve(address to, uint256 tokenId) external;

    function getApproved(uint256 tokenId) external view returns (address);

    function isApprovedForAll(
        address owner,
        address operator
    ) external view returns (bool);

    function setApprovalForAll(address operator, bool approved) external;

    function swapTickets(
        uint256 ticketId1,
        uint256 ticketId2,
        address user1,
        address user2
    ) external;

    function getTicketsForEvent(
        address owner,
        uint256 eventId
    ) external view returns (uint256[] memory);
}

interface ILoyaltySystem {
    function awardPoints(
        address to,
        uint256 weiAmount
    ) external returns (uint256 minted);
}

contract EventManager {
    struct Event {
        uint256 id;
        address organiser;
        string name;
        string venue;
        uint256 date;
        uint256 ticketPrice;
        uint256 totalTickets;
        uint256 ticketsSold;
        bool isActive;
        bool isMultiDay; // New: indicates if event has multiple sub-events
    }

    struct SubEvent {
        uint256 id;
        uint256 parentEventId;
        uint256 dayIndex;
        uint256 date;
        string venue;
        bool swappable;
        uint256 totalTickets;
        uint256 ticketsSold;
    }

    mapping(uint256 => Event) public events; // eventId => Event
    mapping(uint256 => uint256[]) public eventToSubEvents; // parentEventId => subEventIds[]
    mapping(uint256 => SubEvent) public subEvents; // subEventId => SubEvent

    uint256 public eventCounter; // Counter for event IDs
    // Start subEventCounter at a high offset to avoid ID collisions with event IDs
    uint256 public subEventCounter = 1_000_000; // Counter for sub-event IDs
    address public ticketNFTAddress; // Address of the TicketNFT contract
    address public loyaltySystemAddress; // Address of the LoyaltySystem contract
    address public oracle; // Address of the oracle
    address public owner; // Contract owner

    event EventCreated(uint256 eventId, string name, address organiser);
    event MultiDayEventCreated(
        uint256 eventId,
        string name,
        address organiser,
        uint256 numDays
    );
    event SubEventCreated(
        uint256 subEventId,
        uint256 parentEventId,
        uint256 dayIndex
    );
    event TicketsPurchased(uint256 eventId, address buyer, uint256 quantity);
    event SubEventTicketsPurchased(
        uint256 subEventId,
        address buyer,
        uint256 quantity
    );
    event TicketsSwapped(
        uint256 ticketId1,
        uint256 ticketId2,
        address user1,
        address user2
    );
    event EventClosed(uint256 eventId);

    // Constructor to set the contract owner
    constructor() {
        owner = msg.sender;
    }

    // Modifier to restrict access to owner only
    modifier onlyOwner() {
        require(owner == msg.sender, "Not the owner");
        _;
    }

    // Set the TicketNFT contract address
    function setTicketNFTAddress(address _ticketNFTAddress) public onlyOwner {
        ticketNFTAddress = _ticketNFTAddress;
    }

    // Set the LoyaltySystem contract address
    function setLoyaltySystemAddress(
        address _loyaltySystemAddress
    ) public onlyOwner {
        loyaltySystemAddress = _loyaltySystemAddress;
    }

    // Modifier to restrict access to oracle
    modifier oracleOnly() {
        require(oracle == msg.sender, "Not the oracle");
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
            true,
            false // isMultiDay - defaults to false for backward compatibility
        );

        emit EventCreated(eventCounter, name, msg.sender);
    }

    // Create a multi-day event with sub-events
    function createMultiDayEvent(
        string memory name,
        uint256[] memory dates,
        string[] memory venues,
        uint256 ticketPrice,
        uint256[] memory ticketsPerDay,
        bool[] memory swappableFlags
    ) public {
        require(dates.length > 1, "Multi-day event requires at least 2 days");
        require(
            dates.length == venues.length,
            "Dates and venues length mismatch"
        );
        require(
            dates.length == ticketsPerDay.length,
            "Dates and tickets length mismatch"
        );
        require(
            dates.length == swappableFlags.length,
            "Dates and swappable flags length mismatch"
        );

        eventCounter++;

        // Calculate total tickets across all days
        uint256 totalTickets = 0;
        for (uint256 i = 0; i < ticketsPerDay.length; i++) {
            totalTickets += ticketsPerDay[i];
        }

        // Create parent event
        events[eventCounter] = Event(
            eventCounter,
            msg.sender,
            name,
            venues[0], // Use first venue as primary
            dates[0], // Use first date as primary
            ticketPrice,
            totalTickets,
            0,
            true,
            true // isMultiDay
        );

        // Create sub-events for each day
        uint256[] storage subEventIds = eventToSubEvents[eventCounter];
        for (uint256 i = 0; i < dates.length; i++) {
            subEventCounter++;

            subEvents[subEventCounter] = SubEvent(
                subEventCounter,
                eventCounter,
                i,
                dates[i],
                venues[i],
                swappableFlags[i],
                ticketsPerDay[i],
                0
            );

            subEventIds.push(subEventCounter);
            emit SubEventCreated(subEventCounter, eventCounter, i);
        }

        emit MultiDayEventCreated(eventCounter, name, msg.sender, dates.length);
    }

    // Buy tickets for a specific sub-event (day)
    function buySubEventTickets(
        uint256 subEventId,
        uint256 quantity
    ) public payable {
        SubEvent storage subEvent = subEvents[subEventId];
        require(subEvent.id != 0, "Sub-event does not exist");

        Event storage parentEvent = events[subEvent.parentEventId];
        require(parentEvent.isActive, "Parent event is not active");
        require(quantity > 0, "Invalid ticket quantity");
        require(
            subEvent.ticketsSold + quantity <= subEvent.totalTickets,
            "Not enough tickets available for this day"
        );
        require(
            msg.value == parentEvent.ticketPrice * quantity,
            "Incorrect Ether value sent"
        );

        subEvent.ticketsSold += quantity;
        parentEvent.ticketsSold += quantity;

        // Mint tickets to the buyer (using sub-event ID)
        mintSubEventTickets(parentEvent.id, subEventId, quantity, msg.sender);

        // Award loyalty points automatically
        if (loyaltySystemAddress != address(0)) {
            try
                ILoyaltySystem(loyaltySystemAddress).awardPoints(
                    msg.sender,
                    msg.value
                )
            {
                // Loyalty points awarded successfully
            } catch {
                // Loyalty point awarding failed, but don't fail the ticket purchase
            }
        }

        emit SubEventTicketsPurchased(subEventId, msg.sender, quantity);
    }

    // Buy sub-event tickets with loyalty discount (oracle only)
    function buySubEventTicketsWithDiscount(
        uint256 subEventId,
        uint256 quantity,
        address recipient,
        uint256 fullPrice
    ) public payable oracleOnly {
        SubEvent storage subEvent = subEvents[subEventId];
        require(subEvent.id != 0, "Sub-event does not exist");

        Event storage parentEvent = events[subEvent.parentEventId];
        require(parentEvent.isActive, "Parent event is not active");
        require(quantity > 0, "Invalid ticket quantity");
        require(
            subEvent.ticketsSold + quantity <= subEvent.totalTickets,
            "Not enough tickets available for this day"
        );
        require(
            fullPrice == parentEvent.ticketPrice * quantity,
            "Invalid full price"
        );
        // msg.value should be less than fullPrice due to discount

        subEvent.ticketsSold += quantity;
        parentEvent.ticketsSold += quantity;

        // Mint tickets to the recipient (using sub-event ID)
        mintSubEventTickets(parentEvent.id, subEventId, quantity, recipient);

        // DO NOT award loyalty points when discount is used
        // This prevents earning points when points were spent for discount

        emit SubEventTicketsPurchased(subEventId, recipient, quantity);
    }

    // Swap tickets between two users for different days of the same event
    function swapTickets(
        uint256 ticketId1,
        uint256 ticketId2,
        address user1,
        address user2
    ) external {
        require(ticketNFTAddress != address(0), "TicketNFT contract not set");

        ITicketNFT ticketNFT = ITicketNFT(ticketNFTAddress);

        // Verify ownership
        require(
            ticketNFT.ownerOf(ticketId1) == user1,
            "User1 does not own ticket1"
        );
        require(
            ticketNFT.ownerOf(ticketId2) == user2,
            "User2 does not own ticket2"
        );

        // Get the sub-event IDs (or event IDs for single-day tickets) for both tickets
        uint256 subEventId1 = ticketNFT.getSubEventId(ticketId1);
        uint256 subEventId2 = ticketNFT.getSubEventId(ticketId2);

        // Determine parent event IDs for each (handles single-day and sub-events)
        uint256 parentEventId1 = getParentEventId(subEventId1);
        uint256 parentEventId2 = getParentEventId(subEventId2);

        // Tickets must be for the same parent event
        require(
            parentEventId1 == parentEventId2,
            "Tickets must be for the same event"
        );
        require(parentEventId1 != 0, "Invalid event");

        // Both sub-events must be swappable (if they are sub-events)
        if (isSubEvent(subEventId1)) {
            require(
                subEvents[subEventId1].swappable,
                "Ticket1's day is not swappable"
            );
        }
        if (isSubEvent(subEventId2)) {
            require(
                subEvents[subEventId2].swappable,
                "Ticket2's day is not swappable"
            );
        }

        // Verify that one of the users initiated the swap (simple access control)
        require(
            msg.sender == user1 || msg.sender == user2,
            "Unauthorized swap"
        );

        // Check approvals - both users must have approved EventManager to transfer their tickets
        require(
            ticketNFT.getApproved(ticketId1) == address(this) ||
                ticketNFT.isApprovedForAll(user1, address(this)),
            "EventManager not approved to transfer ticket1"
        );
        require(
            ticketNFT.getApproved(ticketId2) == address(this) ||
                ticketNFT.isApprovedForAll(user2, address(this)),
            "EventManager not approved to transfer ticket2"
        );

        // Perform the atomic swap
        ticketNFT.transferFrom(user1, user2, ticketId1);
        ticketNFT.transferFrom(user2, user1, ticketId2);

        emit TicketsSwapped(ticketId1, ticketId2, user1, user2);
    }

    // Helper function to determine if an ID represents a sub-event
    function isSubEvent(uint256 eventId) public view returns (bool) {
        return subEvents[eventId].id != 0;
    }

    // Helper function to get parent event ID (returns the ID itself if it's already a parent)
    function getParentEventId(uint256 eventId) public view returns (uint256) {
        if (isSubEvent(eventId)) {
            return subEvents[eventId].parentEventId;
        }
        return eventId;
    }

    // Get all sub-events for a parent event
    function getSubEvents(
        uint256 parentEventId
    ) external view returns (uint256[] memory) {
        return eventToSubEvents[parentEventId];
    }

    // Get sub-event details
    function getSubEventDetails(
        uint256 subEventId
    )
        external
        view
        returns (
            uint256 id,
            uint256 parentEventId,
            uint256 dayIndex,
            uint256 date,
            string memory venue,
            bool swappable,
            uint256 totalTickets,
            uint256 ticketsSold
        )
    {
        SubEvent storage subEvent = subEvents[subEventId];
        return (
            subEvent.id,
            subEvent.parentEventId,
            subEvent.dayIndex,
            subEvent.date,
            subEvent.venue,
            subEvent.swappable,
            subEvent.totalTickets,
            subEvent.ticketsSold
        );
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

        // Award loyalty points automatically (only for full-price purchases)
        if (loyaltySystemAddress != address(0)) {
            try
                ILoyaltySystem(loyaltySystemAddress).awardPoints(
                    msg.sender,
                    msg.value
                )
            {
                // Loyalty points awarded successfully
            } catch {
                // Loyalty point awarding failed, but don't fail the ticket purchase
            }
        }

        emit TicketsPurchased(eventId, msg.sender, quantity);
    }

    // Buy tickets for an event with loyalty discount (oracle only)
    function buyTicketsWithDiscount(
        uint256 eventId,
        uint256 quantity,
        address recipient,
        uint256 fullPrice
    ) public payable oracleOnly {
        Event storage e = events[eventId];
        require(e.isActive, "Event is not active");
        require(quantity > 0, "Invalid ticket quantity");
        require(
            e.ticketsSold + quantity <= e.totalTickets,
            "Not enough tickets available"
        );
        require(fullPrice == e.ticketPrice * quantity, "Invalid full price");
        // msg.value should be less than fullPrice due to discount

        e.ticketsSold += quantity;

        // Mint tickets to the recipient
        mintTickets(eventId, quantity, recipient);

        // DO NOT award loyalty points when discount is used
        // This prevents earning points when points were spent for discount

        emit TicketsPurchased(eventId, recipient, quantity);
    }

    // Buy tickets for an event on behalf of another address (oracle only)
    function buyTicketsFor(
        uint256 eventId,
        uint256 quantity,
        address recipient
    ) public payable oracleOnly {
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

        // Mint tickets to the specified recipient (not msg.sender)
        mintTickets(eventId, quantity, recipient);

        // Award loyalty points automatically to the recipient
        if (loyaltySystemAddress != address(0)) {
            try
                ILoyaltySystem(loyaltySystemAddress).awardPoints(
                    recipient,
                    msg.value
                )
            {
                // Loyalty points awarded successfully
            } catch {
                // Loyalty point awarding failed, but don't fail the ticket purchase
            }
        }

        emit TicketsPurchased(eventId, recipient, quantity);
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

    // Mint tickets for sub-events
    function mintSubEventTickets(
        uint256 eventId,
        uint256 subEventId,
        uint256 quantity,
        address to
    ) internal {
        require(ticketNFTAddress != address(0), "TicketNFT contract not set");

        ITicketNFT ticketNFT = ITicketNFT(ticketNFTAddress);

        for (uint256 i = 0; i < quantity; i++) {
            // Use the mintForSubEvent function if available, otherwise fall back to regular mint
            ticketNFT.mintForSubEvent(to, eventId, subEventId);
        }
    }

    function closeEvent(uint256 eventId) public oracleOnly {
        Event storage e = events[eventId];
        e.isActive = false;
        emit EventClosed(eventId);
    }

    function originalPrice(uint256 eventId) external view returns (uint256) {
        return events[eventId].ticketPrice;
    }

    function organiser(uint256 eventId) external view returns (address) {
        return events[eventId].organiser;
    }

    function eventEnd(uint256 eventId) external view returns (uint256) {
        return events[eventId].date;
    }

    function eventIsActive(uint256 eventId) external view returns (bool) {
        return events[eventId].isActive;
    }

    // Mark ticket as used (only oracle can do this)
    function markTicketAsUsed(uint256 ticketId) external oracleOnly {
        require(ticketNFTAddress != address(0), "TicketNFT contract not set");
        ITicketNFT ticketNFT = ITicketNFT(ticketNFTAddress);
        ticketNFT.markAsUsed(ticketId);
    }

    function setOracle(address _oracle) public onlyOwner {
        oracle = _oracle;
    }

    // Transfer ownership to a new owner
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }

    // Toggle swappable status for a sub-event (only oracle)
    function setSubEventSwappable(
        uint256 subEventId,
        bool swappable
    ) external oracleOnly {
        require(subEvents[subEventId].id != 0, "Sub-event does not exist");
        subEvents[subEventId].swappable = swappable;
    }

    // Check if two tickets can be swapped
    function canSwapTickets(
        uint256 ticketId1,
        uint256 ticketId2
    ) external view returns (bool) {
        require(ticketNFTAddress != address(0), "TicketNFT contract not set");

        ITicketNFT ticketNFT = ITicketNFT(ticketNFTAddress);

        uint256 subEventId1 = ticketNFT.getSubEventId(ticketId1);
        uint256 subEventId2 = ticketNFT.getSubEventId(ticketId2);

        uint256 parentEventId1 = getParentEventId(subEventId1);
        uint256 parentEventId2 = getParentEventId(subEventId2);

        // Must be for the same parent event
        if (parentEventId1 != parentEventId2 || parentEventId1 == 0) {
            return false;
        }

        // For multi-day events, tickets must be for different sub-events (different days)
        // For regular events, tickets can be from the same event
        if (subEventId1 == subEventId2) {
            return false;
        }

        // Both sub-events must be swappable (if they are sub-events)
        if (isSubEvent(subEventId1) && !subEvents[subEventId1].swappable) {
            return false;
        }
        if (isSubEvent(subEventId2) && !subEvents[subEventId2].swappable) {
            return false;
        }

        return true;
    }

    // Convenience function to check if user has approved EventManager for swapping
    function isApprovedForSwapping(address user) external view returns (bool) {
        require(ticketNFTAddress != address(0), "TicketNFT contract not set");
        ITicketNFT ticketNFT = ITicketNFT(ticketNFTAddress);
        return ticketNFT.isApprovedForAll(user, address(this));
    }

    // Helper function to approve EventManager for all ticket operations
    function approveForSwapping() external {
        require(ticketNFTAddress != address(0), "TicketNFT contract not set");
        ITicketNFT ticketNFT = ITicketNFT(ticketNFTAddress);
        ticketNFT.setApprovalForAll(address(this), true);
    }
}
