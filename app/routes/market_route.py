from fastapi import APIRouter, HTTPException, Depends
from models import (
    ListRequest,
    DelistRequest,
    BuyListingRequest,
    ApprovalRequest,
    ApprovalStatusRequest,
    MarketListingsResponse,
    ListingResponse,
)
from web3_manager import web3_manager
from web3 import Web3
from typing import Optional
from routes.auth_route import require_authenticated_user
from dependencies.role_deps import get_user_wallet_credentials

# Initialize router
router = APIRouter(prefix="/market", tags=["market"])


def _ensure_contracts():
    resale = getattr(web3_manager, "market_manager", None)
    mgr = getattr(web3_manager, "event_manager", None)
    if resale is None or mgr is None:
        raise HTTPException(
            status_code=500, detail="ResaleMarket/Ticket/EventManager not configured"
        )
    return resale, mgr


def _ensure_ticket_contract():
    ticket = getattr(web3_manager, "ticket_nft", None)
    if ticket is None:
        raise HTTPException(
            status_code=500, detail="TicketNFT contract not configured"
        )
    return ticket


# --- APPROVAL ENDPOINTS ---


@router.get("/approval/status", summary="Check if user has approved ResaleMarket")
def check_approval_status(user_info: dict = Depends(require_authenticated_user)):
    """Check if a user has approved the ResaleMarket to transfer their tickets"""
    try:
        wallet_address = user_info["wallet_address"]
        is_approved = web3_manager.check_resale_market_approval(wallet_address)

        return {
            "success": True,
            "user_address": wallet_address,
            "is_approved": is_approved,
            "message": (
                "Approved"
                if is_approved
                else "Not approved - must approve before listing tickets"
            ),
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to check approval status: {str(e)}"
        )


@router.post(
    "/approval/approve", summary="Approve ResaleMarket to transfer user's tickets"
)
def approve_resale_market(
    req: ApprovalRequest, user_info: dict = Depends(require_authenticated_user)
):
    """
    Approve the ResaleMarket contract to transfer user's tickets.
    This is required before users can list tickets for resale.
    """
    try:
        wallet_address = user_info["wallet_address"]

        # Check if already approved
        is_already_approved = web3_manager.check_resale_market_approval(wallet_address)
        if is_already_approved:
            return {
                "success": True,
                "already_approved": True,
                "user_address": wallet_address,
                "message": "ResaleMarket is already approved to transfer your tickets",
            }

        # Get wallet credentials securely only when needed for transaction
        wallet_address, private_key = get_user_wallet_credentials(user_info)

        # Approve ResaleMarket
        tx_hash = web3_manager.approve_resale_market(wallet_address, private_key)

        return {
            "success": True,
            "tx_hash": tx_hash.hex(),
            "user_address": wallet_address,
            "message": "Successfully approved ResaleMarket to transfer your tickets",
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to approve ResaleMarket: {str(e)}"
        )


@router.post("/approval/revoke", summary="Revoke ResaleMarket approval")
def revoke_resale_market_approval(
    req: ApprovalRequest, user_info: dict = Depends(require_authenticated_user)
):
    """
    Revoke the ResaleMarket contract's approval to transfer user's tickets.
    Note: This will prevent listing new tickets, but won't affect existing listings.
    """
    try:
        wallet_address = user_info["wallet_address"]

        # Check if approved
        is_approved = web3_manager.check_resale_market_approval(wallet_address)
        if not is_approved:
            return {
                "success": True,
                "already_revoked": True,
                "user_address": wallet_address,
                "message": "ResaleMarket approval was already revoked",
            }

        # Get wallet credentials securely only when needed for transaction
        wallet_address, private_key = get_user_wallet_credentials(user_info)

        # Revoke approval
        tx_hash = web3_manager.revoke_resale_market_approval(
            wallet_address, private_key
        )

        return {
            "success": True,
            "tx_hash": tx_hash.hex(),
            "user_address": wallet_address,
            "message": "Successfully revoked ResaleMarket approval",
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to revoke ResaleMarket approval: {str(e)}"
        )


# --- LISTING ENDPOINTS ---
@router.post("/list", summary="List a ticket for resale")
def list_ticket(
    req: ListRequest, user_info: dict = Depends(require_authenticated_user)
):
    """
    List a ticket for resale. User must have approved ResaleMarket first.
    ResaleMarket will take custody of the ticket when listed.
    """
    resale, mgr = _ensure_contracts()
    ticket_id = req.ticket_id
    price = int(req.price)
    wallet_address, private_key = get_user_wallet_credentials(user_info)

    try:
        seller_acct = web3_manager.get_user_account(wallet_address, private_key)
        seller_addr = Web3.to_checksum_address(wallet_address)
    except Exception:
        raise HTTPException(status_code=400, detail="invalid wallet credentials")

    # Check if user has approved ResaleMarket
    try:
        is_approved = web3_manager.check_resale_market_approval(wallet_address)
        if not is_approved:
            raise HTTPException(
                status_code=400,
                detail="You must approve the ResaleMarket first. Call /market/approval/approve endpoint.",
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to check approval status: {str(e)}"
        )

    # List the ticket (ResaleMarket will take custody)
    try:
        fn = resale.functions.list(ticket_id, price)
        txn = web3_manager.build_user_transaction(fn, seller_acct, gas=300000)
        tx_hash = web3_manager.sign_and_send_user_transaction(txn, seller_acct)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Listing failed: {str(e)}")

    return {
        "success": True,
        "tx_hash": tx_hash.hex(),
        "ticket_id": ticket_id,
        "price": price,
        "message": "Ticket listed successfully. ResaleMarket now has custody of your ticket.",
    }


@router.post("/delist", summary="Delist a ticket (seller only)")
def delist_ticket(
    req: DelistRequest, user_info: dict = Depends(require_authenticated_user)
):
    resale, mgr = _ensure_contracts()
    ticket_id = req.ticket_id
    wallet_address, private_key = get_user_wallet_credentials(user_info)

    try:
        seller_acct = web3_manager.get_user_account(wallet_address, private_key)
        seller_addr = Web3.to_checksum_address(wallet_address)
    except Exception:
        raise HTTPException(status_code=400, detail="invalid wallet credentials")

    # verify listing exists and seller matches
    try:
        listing = resale.functions.listings(ticket_id).call()
        listing_seller = Web3.to_checksum_address(listing[0])
        active = bool(listing[3]) if len(listing) > 3 else bool(listing[2])
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"listing lookup failed: {e}")

    if not active:
        return {
            "success": False,
            "message": "listing not active",
            "ticket_id": ticket_id,
        }

    if listing_seller != seller_addr:
        raise HTTPException(
            status_code=403, detail="caller is not the seller of this listing."
        )

    try:
        fn = resale.functions.delist(ticket_id)
        txn = web3_manager.build_user_transaction(fn, seller_acct, gas=200000)
        tx_hash = web3_manager.sign_and_send_user_transaction(txn, seller_acct)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"failed to send delist transaction: {e}"
        )

    return {
        "success": True,
        "tx_hash": tx_hash.hex(),
        "ticket_id": ticket_id,
        "message": "delist transaction submitted",
    }


@router.post("/buy", summary="Buy a listed ticket")
def buy_listing(
    req: BuyListingRequest, user_info: dict = Depends(require_authenticated_user)
):
    resale, mgr = _ensure_contracts()
    wallet_address, private_key = get_user_wallet_credentials(user_info)

    try:
        buyer_acct = web3_manager.get_user_account(wallet_address, private_key)
        buyer_addr = Web3.to_checksum_address(wallet_address)
    except Exception:
        raise HTTPException(status_code=400, detail="invalid wallet credentials")

    # read listing
    try:
        listing = resale.functions.listings(req.ticket_id).call()
        listing_active = bool(listing[3]) if len(listing) > 3 else bool(listing[2])
        price = int(listing[1])
        seller_addr = Web3.to_checksum_address(listing[0])
        event_id = int(listing[2])
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"listing not found: {e}")

    if not listing_active:
        return {
            "success": False,
            "message": "listing not active",
            "ticket_id": req.ticket_id,
        }

    if seller_addr == buyer_addr:
        raise HTTPException(status_code=400, detail="cannot buy your own ticket")

    # balance check
    try:
        balance = web3_manager.get_account_balance(buyer_addr)
        if balance < price:
            raise HTTPException(
                status_code=400, detail="insufficient balance to cover listing price"
            )
    except HTTPException:
        raise
    except Exception:
        pass

    # ensure event still active
    try:
        if not mgr.functions.eventIsActive(event_id).call():
            raise HTTPException(status_code=400, detail="event not active")
    except HTTPException:
        raise
    except Exception:
        pass

    # Simulate transaction first to catch reverts
    try:
        resale.functions.buy(req.ticket_id).call({"from": buyer_addr, "value": price})
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Transaction would fail: {str(e)}")

    # Build and send transaction
    try:
        fn = resale.functions.buy(req.ticket_id)
        txn = web3_manager.build_user_transaction(fn, buyer_acct, gas=300000)
        txn["value"] = int(price)
        tx_hash = web3_manager.sign_and_send_user_transaction(txn, buyer_acct)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"failed to send buy transaction: {e}"
        )

    return {
        "success": True,
        "tx_hash": tx_hash.hex(),
        "ticket_id": req.ticket_id,
        "price": price,
        "message": "purchase transaction submitted",
    }


@router.get("/listings", response_model=MarketListingsResponse)
async def get_active_listings(user_info: dict = Depends(require_authenticated_user)):
    """Get all active listings in the marketplace"""
    resale, mgr = _ensure_contracts()
    ticket = _ensure_ticket_contract()

    try:
        # Get the next token ID to know the range of existing tokens
        next_token_id = ticket.functions.nextTokenId().call()
        active_listings = []

        # Iterate through all possible token IDs (1 to next_token_id - 1)
        for token_id in range(1, next_token_id):
            try:
                listing = resale.functions.listings(token_id).call()
                seller_address = listing[0]
                is_active = bool(listing[3])

                if is_active:
                    active_listings.append(
                        ListingResponse(
                            ticket_id=token_id,
                            seller_address=seller_address,
                            price=int(listing[1]),
                            event_id=int(listing[2]),
                            is_active=is_active,
                        )
                    )
            except Exception:
                # Token might not exist or have no listing, continue
                continue

        return MarketListingsResponse(
            listings=active_listings,
            total=len(active_listings),
            message="Successfully retrieved active listings",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch market listings: {str(e)}"
        )


@router.get("/my-listings", response_model=MarketListingsResponse)
async def get_my_listings(user_info: dict = Depends(require_authenticated_user)):
    """Get all listings by the authenticated user"""
    resale, mgr = _ensure_contracts()
    ticket = _ensure_ticket_contract()

    try:
        user_address = user_info["wallet_address"]
        # Get the next token ID to know the range of existing tokens
        next_token_id = ticket.functions.nextTokenId().call()
        user_listings = []

        # Iterate through all possible token IDs (1 to next_token_id - 1)
        for token_id in range(1, next_token_id):
            try:
                listing = resale.functions.listings(token_id).call()
                seller_address = listing[0]
                is_active = bool(listing[3])

                if is_active and seller_address.lower() == user_address.lower():
                    user_listings.append(
                        ListingResponse(
                            ticket_id=token_id,
                            seller_address=seller_address,
                            price=int(listing[1]),
                            event_id=int(listing[2]),
                            is_active=is_active,
                        )
                    )
            except Exception:
                # Token might not exist or have no listing, continue
                continue

        return MarketListingsResponse(
            listings=user_listings,
            total=len(user_listings),
            message=f"Successfully retrieved listings for address {user_address}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch user listings: {str(e)}"
        )
