// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TicketNFT is ERC721, ERC721Enumerable, Ownable {
    mapping(uint256 => bool) public used;
    mapping(uint256 => uint256) public ticketToEvent; // which event does the ticket belong to
    uint256 public nextTokenId = 1;

    event TicketUsed(uint256 ticketId);

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

    // Required overrides for ERC721Enumerable
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
