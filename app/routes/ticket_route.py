from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from dependencies.role_deps import require_authenticated_user
from web3_manager import web3_manager

router = APIRouter(prefix="/tickets", tags=["tickets"])

@router.get("/", summary="Get user ticket overview")
async def get_ticket_overview(user_info: dict = Depends(require_authenticated_user)):
    """Get overview of user's tickets"""
    try:
        user_address = user_info["wallet_address"]
        
        # Get all tickets owned by user
        total_tickets = web3_manager.ticket_nft.functions.balanceOf(user_address).call()
        
        if total_tickets == 0:
            return {
                "success": True,
                "user_address": user_address,
                "overview": {
                    "total_tickets": 0,
                    "valid_tickets": 0,
                    "used_tickets": 0,
                    "events_with_tickets": 0
                },
                "message": "User owns 0 tickets across 0 events"
            }
        
        # Get all ticket IDs owned by user using efficient enumeration
        ticket_ids = []
        
        for i in range(total_tickets):
            ticket_id = web3_manager.ticket_nft.functions.tokenOfOwnerByIndex(user_address, i).call()
            ticket_ids.append(ticket_id)
        
        # Count used vs valid tickets and unique events
        used_tickets = 0
        valid_tickets = 0
        event_ids = set()
        
        for ticket_id in ticket_ids:
            is_used = web3_manager.ticket_nft.functions.isUsed(ticket_id).call()
            event_id = web3_manager.ticket_nft.functions.ticketToEvent(ticket_id).call()
            
            if is_used:
                used_tickets += 1
            else:
                valid_tickets += 1
            
            event_ids.add(event_id)
        
        return {
            "success": True,
            "user_address": user_address,
            "overview": {
                "total_tickets": total_tickets,
                "valid_tickets": valid_tickets,
                "used_tickets": used_tickets,
                "events_with_tickets": len(event_ids)
            },
            "message": f"User owns {total_tickets} tickets across {len(event_ids)} events"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get ticket overview: {str(e)}")

@router.get("/owned", summary="Get all tickets owned by user")
async def get_owned_tickets(user_info: dict = Depends(require_authenticated_user)):
    """Get all tickets owned by the authenticated user"""
    try:
        user_address = user_info["wallet_address"]
        
        # Get number of tickets owned by user
        balance = web3_manager.ticket_nft.functions.balanceOf(user_address).call()
        
        if balance == 0:
            return {
                "success": True,
                "user_address": user_address,
                "tickets": [],
                "total_tickets": 0,
                "message": "No tickets found for user"
            }
        
        tickets = []
        
        # Use efficient enumeration to get all tickets owned by user
        for i in range(balance):
            ticket_id = web3_manager.ticket_nft.functions.tokenOfOwnerByIndex(user_address, i).call()
            
            # Get ticket details
            event_id = web3_manager.ticket_nft.functions.ticketToEvent(ticket_id).call()
            is_used = web3_manager.ticket_nft.functions.isUsed(ticket_id).call()
            
            # Get event details
            event_data = web3_manager.event_manager.functions.events(event_id).call()
            
            ticket_info = {
                "ticket_id": ticket_id,
                "event_id": event_id,
                "event_name": event_data[1],  # name
                "event_location": event_data[0],  # organiser (showing as location for now)
                "event_date": event_data[2],  # venue (showing as date for now)
                "ticket_price": event_data[4],  # date (showing as price for now)
                "is_used": is_used,
                "owner_address": user_address
            }
            
            tickets.append(ticket_info)
        
        return {
            "success": True,
            "user_address": user_address,
            "tickets": tickets,
            "total_tickets": len(tickets),
            "message": f"Found {len(tickets)} tickets owned by user"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get owned tickets: {str(e)}")

@router.get("/{ticket_id}", summary="Get specific ticket details")
async def get_ticket_details(ticket_id: int, user_info: dict = Depends(require_authenticated_user)):
    """Get detailed information about a specific ticket"""
    try:
        user_address = user_info["wallet_address"]
        
        # Check if ticket exists
        try:
            owner = web3_manager.ticket_nft.functions.ownerOf(ticket_id).call()
        except Exception:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        # Get ticket and event information
        event_id = web3_manager.ticket_nft.functions.ticketToEvent(ticket_id).call()
        is_used = web3_manager.ticket_nft.functions.isUsed(ticket_id).call()
        event_data = web3_manager.event_manager.functions.events(event_id).call()
        
        # Check if user is owner
        is_owner = owner.lower() == user_address.lower()
        
        return {
            "success": True,
            "ticket_id": ticket_id,
            "owner_address": owner,
            "is_owner": is_owner,
            "event_id": event_id,
            "event_details": {
                "name": event_data[1],
                "location": event_data[0],  # organiser
                "date": event_data[2],  # venue
                "price": event_data[4],  # date
                "organizer": event_data[3],  # ticketPrice
                "capacity": event_data[5],  # totalTickets
                "total_tickets": event_data[6]  # ticketsSold
            },
            "ticket_status": {
                "is_used": is_used,
                "status": "Used" if is_used else "Valid"
            },
            "message": "Ticket details retrieved successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get ticket details: {str(e)}")

@router.get("/{ticket_id}/check-used", summary="Check if ticket is used")
async def check_ticket_used(ticket_id: int, user_info: dict = Depends(require_authenticated_user)):
    """Check if a specific ticket has been used"""
    try:
        # Check if ticket exists
        try:
            owner = web3_manager.ticket_nft.functions.ownerOf(ticket_id).call()
        except Exception:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        # Get ticket usage status
        is_used = web3_manager.ticket_nft.functions.isUsed(ticket_id).call()
        
        return {
            "success": True,
            "ticket_id": ticket_id,
            "is_used": is_used,
            "status": "Used" if is_used else "Valid",
            "owner_address": owner,
            "message": f"Ticket {ticket_id} is {'used' if is_used else 'valid'}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check ticket status: {str(e)}")

@router.post("/{ticket_id}/mark-used", summary="Mark ticket as used (Admin only)")
async def mark_ticket_used(ticket_id: int, user_info: dict = Depends(require_authenticated_user)):
    """Mark a ticket as used - Only admin (oracle account) can do this"""
    try:
        user_address = user_info["wallet_address"]
        user_account = user_info["account_index"]
        
        # Check if user is admin (account 0 - the oracle account)
        if user_account != 0:
            raise HTTPException(
                status_code=403, 
                detail="Only admin can mark tickets as used"
            )
        
        # Check if ticket exists
        try:
            owner = web3_manager.ticket_nft.functions.ownerOf(ticket_id).call()
        except Exception:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        # Check if ticket is already used
        is_used = web3_manager.ticket_nft.functions.isUsed(ticket_id).call()
        if is_used:
            raise HTTPException(status_code=400, detail="Ticket is already marked as used")
        
        # Mark ticket as used using oracle account (admin account 0)
        admin_account = web3_manager.get_user_account(0)
        
        # Call markTicketAsUsed on EventManager (which owns the TicketNFT contract)
        function_call = web3_manager.event_manager.functions.markTicketAsUsed(ticket_id)
        
        # Build and send transaction from admin account
        txn = web3_manager.build_user_transaction(function_call, admin_account, gas=150000)
        tx_hash = web3_manager.sign_and_send_user_transaction(txn, admin_account)
        
        return {
            "success": True,
            "ticket_id": ticket_id,
            "transaction_hash": tx_hash.hex(),
            "admin_address": user_address,
            "message": f"Ticket {ticket_id} successfully marked as used by admin"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to mark ticket as used: {str(e)}"
        )
