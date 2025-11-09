// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TicketNFT is ERC721, ERC721Enumerable, Ownable {
    mapping(uint256 => bool) public used;
    mapping(uint256 => uint256) public ticketToEvent; // which event/sub-event does the ticket belong to
    mapping(uint256 => uint256) public ticketToSubEvent; // which specific sub-event (for multi-day events)
    uint256 public nextTokenId = 1;

    event TicketUsed(uint256 ticketId);
    event TicketSwapped(uint256 ticketId1, uint256 ticketId2);

    constructor(
        string memory name,
        string memory symbol,
        address initialOwner
    ) ERC721(name, symbol) Ownable(initialOwner) {}

    // Event owner calls mint to create ticket NFT for sale to public
    function mint(
        address to,
        uint256 eventId
    ) external onlyOwner returns (uint256) {
        uint256 tokenId = nextTokenId;
        _safeMint(to, tokenId);
        ticketToEvent[tokenId] = eventId;
        // For backward compatibility, if no sub-event specified, use the event ID
        ticketToSubEvent[tokenId] = eventId;
        nextTokenId++;
        return tokenId;
    }

    // Mint ticket for a specific sub-event (for multi-day events)
    function mintForSubEvent(
        address to,
        uint256 eventId,
        uint256 subEventId
    ) external onlyOwner returns (uint256) {
        uint256 tokenId = nextTokenId;
        _safeMint(to, tokenId);
        ticketToEvent[tokenId] = eventId; // Parent event for compatibility
        ticketToSubEvent[tokenId] = subEventId; // Specific sub-event
        nextTokenId++;
        return tokenId;
    }

    // Event owner calls markAsUsed to redeem the ticket when attendee enters the concert
    function markAsUsed(uint256 ticketId) external onlyOwner {
        used[ticketId] = true;
        emit TicketUsed(ticketId);
    }

    // Attendees can call isUsed to check if their ticket has been redeemed before
    function isUsed(uint256 ticketId) external view returns (bool) {
        return used[ticketId];
    }

    // Get the sub-event ID for a ticket
    function getSubEventId(uint256 ticketId) external view returns (uint256) {
        return ticketToSubEvent[ticketId];
    }

    // Swap two tickets (can only be called by the EventManager contract)
    function swapTickets(
        uint256 ticketId1,
        uint256 ticketId2,
        address user1,
        address user2
    ) external onlyOwner {
        require(ownerOf(ticketId1) == user1, "User1 does not own ticket1");
        require(ownerOf(ticketId2) == user2, "User2 does not own ticket2");

        // Perform the swap by transferring ownership
        _transfer(user1, user2, ticketId1);
        _transfer(user2, user1, ticketId2);

        emit TicketSwapped(ticketId1, ticketId2);
    }

    // Get all tickets owned by an address for a specific event
    function getTicketsForEvent(
        address owner,
        uint256 eventId
    ) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory result = new uint256[](balance);
        uint256 count = 0;

        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(owner, i);
            if (ticketToEvent[tokenId] == eventId) {
                result[count] = tokenId;
                count++;
            }
        }

        // Resize array to actual count
        uint256[] memory finalResult = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            finalResult[i] = result[i];
        }
        return finalResult;
    }

    // Required overrides for ERC721Enumerable
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(
        address account,
        uint128 value
    ) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
