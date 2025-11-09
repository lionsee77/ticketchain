from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from web3_manager import web3_manager as wm
from dependencies.role_deps import require_authenticated_user, get_user_wallet_credentials

router = APIRouter(prefix="/loyalty", tags=["loyalty"])


class AwardPointsRequest(BaseModel):
    wei_amount: int


class RedeemPointsRequest(BaseModel):
    ticket_wei: int


class ApprovalRequest(BaseModel):
    pass  # Empty request body, user info comes from JWT


# --- READ-ONLY ENDPOINTS (No private key needed) ---

@router.get("/balance", summary="Get loyalty points balance for authenticated user")
def balance(user_info: dict = Depends(require_authenticated_user)):
    """Get loyalty points balance for the authenticated user"""
    try:
        wallet_address = user_info["wallet_address"]
        bal = wm.get_points_balance(wallet_address)
        decimals = wm.loyalty_point.functions.decimals().call()
        return {
            "success": True,
            "address": wallet_address,
            "balance": str(bal),
            "decimals": decimals,
            "message": f"User has {bal} loyalty points"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch balance: {e}")


@router.get("/allowance", summary="Get loyalty points allowance for authenticated user")
def allowance(user_info: dict = Depends(require_authenticated_user)):
    """Get how much the LoyaltySystem is approved to spend on behalf of the user"""
    try:
        wallet_address = user_info["wallet_address"]
        allow = wm.get_points_allowance(wallet_address)
        return {
            "success": True,
            "owner": wallet_address,
            "spender": wm.w3.to_checksum_address(wm.loyalty_system.address),
            "allowance": str(allow),
            "message": f"Allowance: {allow} points approved for LoyaltySystem"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch allowance: {e}")


@router.get("/preview", summary="Preview loyalty points redemption discount")
def preview(ticket_wei: int = Query(..., ge=1), user_info: dict = Depends(require_authenticated_user)):
    """Preview how many points can be redeemed and the discount for a given ticket price"""
    try:
        wallet_address = user_info["wallet_address"]
        pts = wm.preview_points_available(wallet_address, ticket_wei)
        discount = wm.quote_wei_from_points(pts)
        due = ticket_wei - discount
        discount_pct = round((discount / ticket_wei) * 100, 2) if ticket_wei > 0 else 0
        
        return {
            "success": True,
            "address": wallet_address,
            "ticket_wei": str(ticket_wei),
            "points_applicable": str(pts),
            "wei_discount": str(discount),
            "wei_due": str(due),
            "discount_percentage": discount_pct,
            "message": f"Can apply {pts} points for {discount} wei discount ({discount_pct}%)"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to preview: {e}")


# --- APPROVAL ENDPOINT (Requires private key to sign approval transaction) ---

@router.post("/approval/approve", summary="Approve LoyaltySystem to spend loyalty points")
def approve_loyalty_system(
    req: ApprovalRequest, user_info: dict = Depends(require_authenticated_user)
):
    """
    Approve the LoyaltySystem contract to spend/burn user's loyalty points.
    This is required before loyalty points can be redeemed.
    User signs this transaction with their private key.
    """
    try:
        wallet_address = user_info["wallet_address"]

        # Check if already approved
        current_allowance = wm.get_points_allowance(wallet_address)
        max_allowance = 2**256 - 1  # Max uint256
        
        if current_allowance >= max_allowance // 2:
            return {
                "success": True,
                "already_approved": True,
                "user_address": wallet_address,
                "current_allowance": str(current_allowance),
                "message": "LoyaltySystem is already approved to spend your loyalty points"
            }

        # Get wallet credentials securely only when needed for transaction
        wallet_address, private_key = get_user_wallet_credentials(user_info)

        # Get user account for signing
        user_account = wm.get_user_account(wallet_address, private_key)
        
        # Approve LoyaltySystem to spend loyalty points
        function_call = wm.loyalty_point.functions.approve(
            wm.w3.to_checksum_address(wm.loyalty_system.address),
            max_allowance
        )
        
        txn = wm.build_user_transaction(function_call, user_account, gas=100000)
        tx_hash = wm.sign_and_send_user_transaction(txn, user_account)

        return {
            "success": True,
            "tx_hash": tx_hash.hex(),
            "user_address": wallet_address,
            "approved_amount": str(max_allowance),
            "message": "Successfully approved LoyaltySystem to spend your loyalty points"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to approve LoyaltySystem: {str(e)}"
        )


@router.get("/approval/status", summary="Check if user has approved LoyaltySystem")
def check_approval_status(user_info: dict = Depends(require_authenticated_user)):
    """Check if the authenticated user has approved LoyaltySystem to spend their points"""
    try:
        wallet_address = user_info["wallet_address"]
        allowance = wm.get_points_allowance(wallet_address)
        is_approved = allowance > 0

        return {
            "success": True,
            "user_address": wallet_address,
            "allowance": str(allowance),
            "is_approved": is_approved,
            "message": (
                f"Approved with allowance: {allowance}"
                if is_approved
                else "Not approved - must approve before redeeming points"
            ),
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to check approval status: {str(e)}"
        )


# --- AWARD ENDPOINT (Authenticated user earns points for themselves) ---

@router.post("/award", summary="Award loyalty points to authenticated user")
def award_points(request: AwardPointsRequest, user_info: dict = Depends(require_authenticated_user)):
    """
    Award loyalty points to the authenticated user based on wei amount spent.
    This is typically called after a purchase. Oracle account signs the transaction.
    """
    try:
        wallet_address = user_info["wallet_address"]
        points_awarded = wm.award_loyalty_points(wallet_address, request.wei_amount)
        
        return {
            "success": True,
            "to_address": wallet_address,
            "wei_amount": request.wei_amount,
            "points_awarded": str(points_awarded),
            "message": f"Successfully awarded {points_awarded} loyalty points to {wallet_address}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to award points: {e}")


# --- REDEEM ENDPOINT (No user private key needed - oracle calls contract) ---

@router.post("/redeem", summary="Redeem loyalty points for ticket discount")
def redeem_points(request: RedeemPointsRequest, user_info: dict = Depends(require_authenticated_user)):
    """
    Redeem loyalty points for a ticket purchase discount (up to 30% of ticket price).
    User must have already approved LoyaltySystem to spend their points.
    Oracle account calls the redemption function on behalf of the user.
    """
    try:
        wallet_address = user_info["wallet_address"]
        
        # Check if user has sufficient points
        points_available = wm.preview_points_available(wallet_address, request.ticket_wei)
        if points_available == 0:
            return {
                "success": True,
                "points_redeemed": 0,
                "wei_discount": 0,
                "wei_due": request.ticket_wei,
                "message": "No loyalty points available for redemption"
            }
        
        # Check if user has approved LoyaltySystem
        allowance = wm.get_points_allowance(wallet_address)
        if allowance < points_available:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient allowance. Please approve LoyaltySystem first. Need {points_available}, have {allowance}"
            )
        
        # Use oracle account to call redemption (oracle is authorized spender)
        oracle_account = wm.get_user_account_by_index(0)
        
        function_call = wm.loyalty_system.functions.redeemPointsTicket(
            wm.w3.to_checksum_address(wallet_address),
            int(request.ticket_wei)
        )
        
        txn = wm.build_user_transaction(function_call, oracle_account, gas=200000)
        tx_hash = wm.sign_and_send_user_transaction(txn, oracle_account)
        
        # Get transaction receipt to parse events
        receipt = wm.w3.eth.wait_for_transaction_receipt(tx_hash)
        
        # Parse the PointsRedeemedTicket event
        redeem_events = wm.loyalty_system.events.PointsRedeemedTicket().process_receipt(receipt)
        
        points_redeemed = 0
        wei_discount = 0
        if redeem_events:
            points_redeemed = redeem_events[0]["args"]["pointsBurned"]
            wei_discount = redeem_events[0]["args"]["weiDiscount"]
        
        wei_due = request.ticket_wei - wei_discount
        discount_pct = round((wei_discount / request.ticket_wei) * 100, 2) if request.ticket_wei > 0 else 0
        
        return {
            "success": True,
            "tx_hash": tx_hash.hex(),
            "user_address": wallet_address,
            "ticket_wei": str(request.ticket_wei),
            "points_redeemed": str(points_redeemed),
            "wei_discount": str(wei_discount),
            "wei_due": str(wei_due),
            "discount_percentage": discount_pct,
            "message": f"Successfully redeemed {points_redeemed} points for {wei_discount} wei discount ({discount_pct}%)"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to redeem points: {str(e)}")
