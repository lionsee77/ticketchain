from fastapi import APIRouter, HTTPException
from models import ListRequest, DelistRequest, BuyListingRequest
from web3_manager import web3_manager
from web3 import Web3
from typing import Optional

# Initialize router
router = APIRouter(prefix="/market", tags=["market"])

def _ensure_contracts():
    resale = getattr(web3_manager, "market_manager", None)
    mgr = getattr(web3_manager, "event_manager", None)
    if resale is None or mgr is None:
        raise HTTPException(status_code=500, detail="ResaleMarket/Ticket/EventManager not configured")
    return resale, mgr


# Need to figure out a way for users to approve ResaleMarket prior to listing

# @router.post("/list", summary="List a ticket for resale")
# def list_ticket(req: ListRequest):
#     resale, mgr = _ensure_contracts()
#     ticket_id = req.ticket_id
#     price = int(req.price)

#     try:
#         seller_acct = web3_manager.get_user_account(req.seller_account)
#         seller_addr = Web3.toChecksumAddress(web3_manager.get_user_address(req.seller_account))
#     except Exception:
#         raise HTTPException(status_code=400, detail="invalid seller_account index")

#     # Use regular list function - approval must be done separately
#     try:
#         fn = resale.functions.list(ticket_id, price)
#         txn = web3_manager.build_user_transaction(fn, seller_acct, gas=300000)
#         tx_hash = web3_manager.sign_and_send_user_transaction(txn, seller_acct)
#     except Exception as e:
#         raise HTTPException(
#             status_code=500, 
#             detail=f"Listing failed. Make sure you own the ticket and approved the market: {str(e)}"
#         )

#     return {
#         "success": True, 
#         "tx_hash": tx_hash.hex(), 
#         "ticket_id": ticket_id, 
#         "price": price,
#         "message": "IMPORTANT: You must approve the ResaleMarket contract in your wallet to allow ticket transfers"
#     }


@router.post("/delist", summary="Delist a ticket (seller only)")
def delist_ticket(req: DelistRequest):
    resale, mgr = _ensure_contracts()
    ticket_id = req.ticket_id

    try:
        seller_acct = web3_manager.get_user_account(req.seller_account)
        seller_addr = web3_manager.get_user_address(req.seller_account)
    except Exception:
        raise HTTPException(status_code=400, detail="invalid seller_account index")

    # verify listing exists and seller matches
    try:
        listing = resale.functions.listings(ticket_id).call()
        listing_seller = listing[0]
        active = bool(listing[3]) if len(listing) > 3 else bool(listing[2])
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"listing lookup failed: {e}")

    if not active:
        return {"success": False, "message": "listing not active", "ticket_id": ticket_id}

    if listing_seller != seller_addr:
        raise HTTPException(status_code=403, 
                            detail="caller is not the seller of this listing.")

    try:
        fn = resale.functions.delist(ticket_id)
        txn = web3_manager.build_user_transaction(fn, seller_acct, gas=200000)
        tx_hash = web3_manager.sign_and_send_user_transaction(txn, seller_acct)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"failed to send delist transaction: {e}")

    return {"success": True, "tx_hash": tx_hash.hex(), "ticket_id": ticket_id, "message": "delist transaction submitted"}

@router.post("/{ticket_id}/buy", summary="Buy a listed ticket")
def buy_listing(ticket_id: int, req: BuyListingRequest):
    resale, mgr = _ensure_contracts()

    try:
        buyer_acct = web3_manager.get_user_account(req.buyer_account)
        buyer_addr = web3_manager.get_user_address(req.buyer_account)
    except Exception:
        raise HTTPException(status_code=400, detail="invalid buyer_account index")

    # read listing
    try:
        listing = resale.functions.listings(ticket_id).call()
        listing_active = bool(listing[3]) if len(listing) > 3 else bool(listing[2])
        price = int(listing[1])
        seller_addr = listing[0]
        event_id = int(listing[2])
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"listing not found: {e}")

    if not listing_active:
        return {"success": False, "message": "listing not active", "ticket_id": ticket_id}

    if seller_addr == buyer_addr:
        raise HTTPException(status_code=400, detail="cannot buy your own ticket")

    # balance check
    try:
        balance = web3_manager.get_account_balance(buyer_addr)
        if balance < price:
            raise HTTPException(status_code=400, detail="insufficient balance to cover listing price")
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
        resale.functions.buy(ticket_id).call({
            "from": buyer_addr,
            "value": price
        })
    except Exception as e:
        raise HTTPException(
            status_code=400, 
            detail=f"Transaction would fail: {str(e)}"
        )
    
    # Build and send transaction
    try:
        fn = resale.functions.buy(ticket_id)
        txn = web3_manager.build_user_transaction(fn, buyer_acct, gas=300000)
        txn["value"] = int(price)
        tx_hash = web3_manager.sign_and_send_user_transaction(txn, buyer_acct)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"failed to send buy transaction: {e}")

    return {
        "success": True,
        "tx_hash": tx_hash.hex(),
        "ticket_id": ticket_id,
        "price": price,
        "message": "purchase transaction submitted"
    }


