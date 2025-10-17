from fastapi import APIRouter, HTTPException
from web3_manager import web3_manager

router = APIRouter(prefix="/accounts", tags=["accounts"])

@router.get("/test-accounts", summary="Get Hardhat test accounts")
async def get_test_accounts():
    """Get Hardhat test account information for development"""
    try:
        accounts_info = []
        for i in range(10):  # Show first 10 accounts
            address = web3_manager.get_user_address(i)
            balance = web3_manager.get_account_balance(address)
            balance_eth = web3_manager.w3.from_wei(balance, "ether")

            accounts_info.append(
                {
                    "index": i,
                    "address": address,
                    "balance_wei": balance,
                    "balance_eth": float(balance_eth),
                }
            )

        return {
            "accounts": accounts_info,
            "network": "localhost:8545",
            "note": "These are Hardhat test accounts for development only",
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get account info: {str(e)}"
        )