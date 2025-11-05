// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

//interface with the ticketNFT contract to get tickets
interface ITicketNFT is IERC721 {
    function ticketToEvent(uint256 tokenId) external view returns (uint256); //returns event id associated with a given ticket 
    function isUsed(uint256 tokenId) external view returns (bool); //checks if the ticket has already been redeemed 
}

 //interface with the eventmanager to check the events' status
interface IEventManager {
    function eventIsActive(uint256 eventId) external view returns (bool); //checks if the event is still active (not closed)
    function eventEnd(uint256 eventId) external view returns (uint256); //returns the timestamp of when the event ends
}


contract TicketSwap is ReentrancyGuard, Ownable {
    //facilitates ticketswap via offers
    // user A (maker) offers their ticket for a specific desired ticket, user B (taker) accepts the offer
    //the swap happens in one transaction

    struct Offer {
        uint256 id;
        address maker; // The user creating the offer (User A)
        uint256 makerTicketId; // The ticket they are offering
        uint256 desiredTicketId; // The specific ticket they want
        bool active; // Is the offer still valid?
        address taker; // The user who accepted the offer (User B)
    }

    ITicketNFT public immutable ticket; // The TicketNFT contract
    IEventManager public immutable manager; // The EventManager contract

    mapping(uint256 => Offer) public offers; // offerId => Offer
    uint256 public offerCounter;

    event OfferCreated(
        uint256 indexed offerId,
        address indexed maker,
        uint256 indexed makerTicketId,
        uint256 desiredTicketId
    );

    event OfferCancelled(uint256 indexed offerId, address indexed maker);

    event OfferAccepted(
        uint256 indexed offerId,
        address indexed maker,
        address indexed taker,
        uint256 makerTicketId,
        uint256 takerTicketId
    );

    constructor(
        address _ticket, // address of the TicketNFT contract
        address _manager, // address of the EventManager contract
        address _initialOwner // the owner of the contract (for managing fees)
    ) Ownable(_initialOwner) {
        ticket = ITicketNFT(_ticket);
        manager = IEventManager(_manager);
    }

    function createOffer(
        // Creates a swap offer (conditional on the caller having approved this contract to transfer their ticket)
        uint256 _myTicketId, // The ticket ID the caller is offering.
        uint256 _desiredTicketId // The specific ticket ID the caller wants in return.
    ) external {
        require(
            ticket.ownerOf(_myTicketId) == msg.sender,
            "Not ticket owner"
        );
        require(
            ticket.getApproved(_myTicketId) == address(this),
            "Contract not approved to transfer your ticket"
        );
        require(_myTicketId != _desiredTicketId, "Cannot swap for same ticket");

        // Check event status for the ticket being offered
        uint256 eventId = ticket.ticketToEvent(_myTicketId);
        require(manager.eventIsActive(eventId), "Event not active");
        require(
            block.timestamp < manager.eventEnd(eventId),
            "Event already ended"
        );
        require(!ticket.isUsed(_myTicketId), "Ticket already used");

        offerCounter++;
        uint256 newOfferId = offerCounter;

        offers[newOfferId] = Offer({
            id: newOfferId,
            maker: msg.sender,
            makerTicketId: _myTicketId,
            desiredTicketId: _desiredTicketId,
            active: true,
            taker: address(0)
        });

        emit OfferCreated(newOfferId, msg.sender, _myTicketId, _desiredTicketId);
    }

    function cancelOffer(uint256 _offerId) external {
        // Cancels an active offer. Only the offer maker can do this.
        Offer storage offer = offers[_offerId];
        require(offer.active, "Offer not active");
        require(offer.maker == msg.sender, "Not the offer maker");

        offer.active = false; //doing this preserves the history that the offer existed, rather than deleting it

        emit OfferCancelled(_offerId, msg.sender);
    }

    function acceptOffer(uint256 _offerId) external nonReentrant {
        // Accepts an active swap offer. 
        // (Conditional on the owner of the desiredTicketId having approved this contract to transfer their ticket)

        Offer storage offer = offers[_offerId];
        require(offer.active, "Offer not active");
        require(offer.maker != msg.sender, "Cannot accept your own offer");

        uint256 takerTicketId = offer.desiredTicketId;
        require(
            ticket.ownerOf(takerTicketId) == msg.sender,
            "You do not own the desired ticket"
        );
        require(
            ticket.getApproved(takerTicketId) == address(this),
            "Contract not approved to transfer your ticket"
        );

        //TODO: implement code to check for same event different day! // consider if different events can trade s
        // Security/Sanity Check: Ensure both tickets are for the same event.
        uint256 makerEventId = ticket.ticketToEvent(offer.makerTicketId);
        uint256 takerEventId = ticket.ticketToEvent(takerTicketId);
        require(makerEventId == takerEventId, "Tickets are for different events");

        // Check event status (in case it ended after the offer was created)
        require(manager.eventIsActive(makerEventId), "Event not active");
        require(
            block.timestamp < manager.eventEnd(makerEventId),
            "Event already ended"
        );
        require(!ticket.isUsed(takerTicketId), "Your ticket is already used");
        
        // Final check: ensure maker still owns their ticket
        require(
            ticket.ownerOf(offer.makerTicketId) == offer.maker,
            "Offer maker no longer owns their ticket"
        );

        offer.active = false;
        offer.taker = msg.sender;

        // 1. Transfer maker's ticket (User A) to taker (User B)
        ticket.safeTransferFrom(
            offer.maker,
            msg.sender,
            offer.makerTicketId
        );

        // 2. Transfer taker's ticket (User B) to maker (User A)
        ticket.safeTransferFrom(
            msg.sender,
            offer.maker,
            takerTicketId
        );

        emit OfferAccepted(
            _offerId,
            offer.maker,
            msg.sender,
            offer.makerTicketId,
            takerTicketId
        );
    }
}
