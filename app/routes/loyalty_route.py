from fastapi import APIRouter, HTTPException, Query
from web3_manager import web3_manager as wm

router = APIRouter(prefix="/loyalty", tags=["loyalty"])

@router.get("/balance/{address}")
def balance(address: str):
    try:
        bal = wm.get_points_balance(address)
        decimals = wm.loyalty_point.functions.decimals().call()
        return {
            "address": address,
            "balance": str(bal),
            "decimals": decimals,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch balance: {e}")

@router.get("/allowance/{owner}")
def allowance(owner: str):
    try:
        allow = wm.get_points_allowance(owner)
        return {"owner": owner, "spender": wm.w3.to_checksum_address(wm.loyalty_system.address), "allowance": str(allow)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch allowance: {e}")

@router.get("/preview")
def preview(address: str = Query(...), ticket_wei: int = Query(..., ge=1)):
    """Returns how many points can be applied (partial up to 30%) and the ETH discount."""
    try:
        pts = wm.preview_points_available(address, ticket_wei)
        discount = wm.quote_wei_from_points(pts)
        due = ticket_wei - discount
        return {
            "address": address,
            "ticket_wei": str(ticket_wei),
            "points_applicable": str(pts),
            "wei_discount": str(discount),
            "wei_due": str(due),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to preview: {e}")
