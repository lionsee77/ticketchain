// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ILoyaltyPoint {
  function decimals() external view returns (uint8);
  function balanceOf(address account) external view returns (uint256);
  function mint(address to, uint256 amount) external;
  function burnFrom(address account, uint256 amount) external;
}

contract LoyaltySystem is Ownable, ReentrancyGuard {
  ILoyaltyPoint public immutable points;
  uint256 public pointsPerEther;
  mapping(address => bool) public isSpender; //allowlist switch for who can mint/burn loyalty points (EventManager)

  event RateUpdated(uint256 oldRate, uint256 newRate);
  event SpenderSet(address spender, bool allowed);
  event PointsAwarded(address to, uint256 weiAmount, uint256 pointsMinted);
  event PointsRedeemedTicket(address from, uint256 pointsBurned, uint256 weiDiscount);
  event PointsRedeemedQueue(address from, uint256 pointsBurned);

  constructor(
    address initialOwner,
    address loyaltyPoint,
    uint256 initialPointsPerEther
  ) Ownable(initialOwner) {
    require(loyaltyPoint != address(0), "points=0");
    points = ILoyaltyPoint(loyaltyPoint);
    _setRate(initialPointsPerEther);
  }

  // Set new exchange rate for loyalty points
  function setRate(uint256 newPointsPerEther) external onlyOwner {
    _setRate(newPointsPerEther);
  }

  // Internal setter for new exchange rate
  function _setRate(uint256 newPointsPerEther) internal {
    emit RateUpdated(pointsPerEther, newPointsPerEther);
    pointsPerEther = newPointsPerEther;
  }

  // Set who can mint/burn loyalty points
  function setSpender(address s, bool allowed) external onlyOwner {
    isSpender[s] = allowed;
    emit SpenderSet(s, allowed);
  }

  // Get points from wei
  function quotePointsFromWei(uint256 weiAmount) public view returns (uint256) {
    require(pointsPerEther > 0, "Rate = 0, loyalty points not active now");
    return (weiAmount * pointsPerEther) / 1e18;
  }

  /// Get wei from points
  function quoteWeiFromPoints(uint256 pointUnits) public view returns (uint256) {
    require(pointsPerEther > 0, "Rate = 0, loyalty points not active now");
    return (pointUnits * 1e18) / pointsPerEther;
  }

  // Preview number of points available for redemption for a particular transaction
  function previewPointsAvailableForRedemption(address user, uint256 ticketWei) public view
    returns (uint256 availablePoints)
  {
    uint256 capWei = (ticketWei * 30) / 100; // 30% of ticket in wei
    uint256 capPoints = quotePointsFromWei(capWei);
    uint256 userPoints = points.balanceOf(user);
    return (userPoints >= capPoints ? capPoints : userPoints);
  }

  // Award loyalty points
  function awardPoints(address to, uint256 weiAmount) external nonReentrant returns (uint256 minted) {
    require(isSpender[msg.sender], "Not authorised for awarding loyalty points");
    require(to != address(0), "Invalid to address");
    require(weiAmount > 0, "Invalid transaction amount. Transaction amount should be greater than 0");
    minted = quotePointsFromWei(weiAmount);
    if (minted > 0) {
      points.mint(to, minted);
      emit PointsAwarded(to, weiAmount, minted);
    }
  }

  // Redeem loyalty points for ticket purchase (frontend to handle allowance)
  function redeemPointsTicket(address from, uint256 ticketWei) external nonReentrant 
    returns (uint256 pointsBurned, uint256 weiDiscount)
    {
    require(isSpender[msg.sender], "Not authorised for redeeming loyalty points");
    require(from != address(0), "Invalid to address");
    require(ticketWei > 0, "Invalid transaction amount. Transaction amount should be greater than 0");

    pointsBurned = previewPointsAvailableForRedemption(from, ticketWei);
    if (pointsBurned > 0) {
        points.burnFrom(from, pointsBurned);
        weiDiscount = quoteWeiFromPoints(pointsBurned);
    } else {
        weiDiscount = 0;
    }
    emit PointsRedeemedTicket(from, pointsBurned, weiDiscount);
    }

  // Redeem loyalty points for queue priority
  function redeemPointsQueue(address from, uint256 pointsAmt) external nonReentrant 
    {
    require(isSpender[msg.sender], "Not authorised for redeeming loyalty points");
    require(from != address(0), "Invalid to address");
    require(pointsAmt > 0, "Invalid redemption amount. Points amount should be greater than 0");
    
    points.burnFrom(from, pointsAmt);
    emit PointsRedeemedQueue(from, pointsAmt);
    }
}
