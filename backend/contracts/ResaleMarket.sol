// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface ITicketNFT is IERC721 {
    function isUsed(uint256 tokenId) external view returns (bool);

    function ticketToEvent(uint256 tokenId) external view returns (uint256);
}

interface IEventManager {
    function originalPrice(uint256 eventId) external view returns (uint256);

    function organiser(uint256 eventId) external view returns (address);

    function eventEnd(uint256 eventId) external view returns (uint256);

    function eventIsActive(uint256 eventId) external view returns (bool);
}

contract ResaleMarket is ReentrancyGuard, Ownable {
    using Address for address payable; // for sendValue
    struct Listing {
        address seller;
        uint256 price; // wei
        uint256 eventId;
        bool active;
    }

    mapping(uint256 => Listing) public listings; // ticketId => Listing
    uint96 public resaleCapBps; // e.g., 11000 = 110%
    uint96 public royaltyBps; // e.g., 500 = 5%
    ITicketNFT public immutable ticket; // TicketNFT contract
    IEventManager public immutable manager; // EventManager contract

    event Listed(
        uint256 indexed ticketId,
        address indexed seller,
        uint256 price,
        uint256 eventId
    );
    event Delisted(uint256 indexed ticketId, address indexed seller);
    event Purchased(
        uint256 indexed ticketId,
        address indexed seller,
        address indexed buyer,
        uint256 price,
        uint256 royalty
    );

    constructor(
        address _ticket,
        address _manager,
        uint96 _capBps,
        uint96 _royaltyBps,
        address _initialOwner
    ) Ownable(_initialOwner) {
        ticket = ITicketNFT(_ticket);
        manager = IEventManager(_manager);
        resaleCapBps = _capBps; // set 0 to disable cap
        royaltyBps = _royaltyBps; // set 0 to disable royalty
    }

    function setResaleCapBps(uint96 bps) external onlyOwner {
        resaleCapBps = bps;
    }

    function setRoyaltyBps(uint96 bps) external onlyOwner {
        royaltyBps = bps;
    }

    // Seller lists a ticket. Must have approved market to transfer the NFT.
    function list(uint256 ticketId, uint256 price) external {
        require(ticket.ownerOf(ticketId) == msg.sender, "Not ticket owner");
        require(!ticket.isUsed(ticketId), "Ticket already used");
        require(price > 0, "Price must be positive");

        uint256 eventId = ticket.ticketToEvent(ticketId);
        require(manager.eventIsActive(eventId), "Event not active");
        require(
            (block.timestamp < manager.eventEnd(eventId)),
            "Event already ended"
        );

        // Enforce price cap if set
        if (resaleCapBps > 0) {
            uint256 originalPrice = manager.originalPrice(eventId);
            require(
                price <= (originalPrice * resaleCapBps) / 10000,
                "Price exceeds cap"
            );
        }

        listings[ticketId] = Listing({
            seller: msg.sender,
            price: price,
            eventId: eventId,
            active: true
        });

        emit Listed(ticketId, msg.sender, price, eventId);
    }

    function delist(uint256 ticketId) external {
        Listing memory listing = listings[ticketId];
        require(listing.active, "Listing not active");
        require(listing.seller == msg.sender, "Not the seller");
        delete listings[ticketId];
        emit Delisted(ticketId, msg.sender);
    }

    // Atomic purchase: pays ETH, transfers NFT, pays seller & organiser.
    function buy(uint256 ticketId) external payable nonReentrant {
        // Checks
        Listing memory listing = listings[ticketId];
        require(listing.active, "Listing not active");
        require(msg.value == listing.price, "Incorrect price");
        require(listing.seller != msg.sender, "Cannot buy your own ticket");
        require(
            ticket.ownerOf(ticketId) == listing.seller,
            "Seller no longer owns ticket"
        );
        require(!ticket.isUsed(ticketId), "Ticket already used");
        require(manager.eventIsActive(listing.eventId), "Event not active");
        require(
            (block.timestamp < manager.eventEnd(listing.eventId)),
            "Event already ended"
        );
        if (resaleCapBps > 0) {
            uint256 originalPrice = manager.originalPrice(listing.eventId);
            require(
                listing.price <= (originalPrice * resaleCapBps) / 10000,
                "Price exceeds cap"
            );
        }

        // Effects
        delete listings[ticketId];

        // interactions – royalty then seller
        uint256 royalty = (royaltyBps > 0)
            ? (msg.value * royaltyBps) / 10_000
            : 0;
        address payable org = payable(manager.organiser(listing.eventId));
        if (royalty > 0 && org != address(0)) payable(org).sendValue(royalty);

        payable(listing.seller).sendValue(msg.value - royalty);

        // final interaction – NFT transfer to buyer (requires prior approval)
        ticket.safeTransferFrom(listing.seller, msg.sender, ticketId);

        emit Purchased(
            ticketId,
            listing.seller,
            msg.sender,
            msg.value,
            royalty
        );
    }
}
