from fastapi import APIRouter, HTTPException, Depends
from models import (
    CreateEventRequest,
    CreateMultiDayEventRequest,
    BuyTicketsRequest,
    BuySubEventTicketsRequest,
    SwapTicketsRequest,
    CheckSwapEligibilityRequest,
    SetSubEventSwappableRequest,
    SubEventDetails,
)
from web3_manager import web3_manager
from dependencies.role_deps import require_roles
from routes.auth_route import require_authenticated_user

# Initialize router
router = APIRouter(prefix="/events", tags=["events"])


@router.post("/create")
# requires Unix timestamp obtain via CLI -> date -j -f "%d%m%Y" "20102026" "+%s"
async def create_event(
    request: CreateEventRequest,
    user_info: dict = Depends(
        require_roles(
            ["admin", "organiser"]
        ),  # Authorization: admin or organiser roles required
    ),
):
    """Create a new event - requires admin or organiser role"""
    try:
        # Check Web3 connection
        if not web3_manager.is_connected():
            raise HTTPException(
                status_code=503, detail="Blockchain connection unavailable"
            )

        # Validate inputs
        if not request.name.strip():
            raise HTTPException(status_code=400, detail="Event name cannot be empty")

        if not request.venue.strip():
            raise HTTPException(status_code=400, detail="Venue cannot be empty")

        if request.date <= 0:
            raise HTTPException(status_code=400, detail="Invalid date")

        if request.price <= 0:
            raise HTTPException(status_code=400, detail="Price must be greater than 0")

        if request.total_tickets <= 0:
            raise HTTPException(
                status_code=400, detail="Total tickets must be greater than 0"
            )

        # Build transaction using web3_manager oracle account (only oracle can create events)
        function_call = web3_manager.event_manager.functions.createEvent(
            request.name,
            request.venue,
            request.date,
            request.price,
            request.total_tickets,
        )

        txn = web3_manager.build_transaction(function_call)
        tx_hash = web3_manager.sign_and_send_transaction(txn)

        return {
            "success": True,
            "tx_hash": tx_hash.hex(),
            "message": f"Event '{request.name}' created successfully",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create event: {str(e)}")


@router.post("/multi-day")
async def create_multi_day_event(
    request: CreateMultiDayEventRequest,
    user_info: dict = Depends(
        require_roles(
            ["admin", "organiser"]
        ),  # Authorization: admin or organiser roles required
    ),
):
    """Create a multi-day event - requires admin or organiser role"""
    try:
        # Check Web3 connection
        if not web3_manager.is_connected():
            raise HTTPException(
                status_code=503, detail="Blockchain connection unavailable"
            )

        # Validate inputs
        if not request.name.strip():
            raise HTTPException(status_code=400, detail="Event name cannot be empty")

        if len(request.dates) < 2:
            raise HTTPException(
                status_code=400, detail="Multi-day event requires at least 2 days"
            )

        if len(request.dates) != len(request.venues):
            raise HTTPException(
                status_code=400, detail="Dates and venues length mismatch"
            )

        if len(request.dates) != len(request.tickets_per_day):
            raise HTTPException(
                status_code=400, detail="Dates and tickets per day length mismatch"
            )

        if len(request.dates) != len(request.swappable_flags):
            raise HTTPException(
                status_code=400, detail="Dates and swappable flags length mismatch"
            )

        for i, date in enumerate(request.dates):
            if date <= 0:
                raise HTTPException(
                    status_code=400, detail=f"Invalid date for day {i+1}"
                )

        for i, venue in enumerate(request.venues):
            if not venue.strip():
                raise HTTPException(
                    status_code=400, detail=f"Venue cannot be empty for day {i+1}"
                )

        if request.price <= 0:
            raise HTTPException(status_code=400, detail="Price must be greater than 0")

        for i, tickets in enumerate(request.tickets_per_day):
            if tickets <= 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Tickets per day must be greater than 0 for day {i+1}",
                )

        # Build transaction using web3_manager oracle account
        function_call = web3_manager.event_manager.functions.createMultiDayEvent(
            request.name,
            request.dates,
            request.venues,
            request.price,
            request.tickets_per_day,
            request.swappable_flags,
        )

        # Multi-day events require higher gas limit due to multiple storage operations
        gas_limit = 800000 + (len(request.dates) * 200000)  # Base + per-day costs
        txn = web3_manager.build_transaction(function_call, gas=gas_limit)
        tx_hash = web3_manager.sign_and_send_transaction(txn)

        return {
            "success": True,
            "tx_hash": tx_hash.hex(),
            "message": f"Multi-day event '{request.name}' created successfully with {len(request.dates)} days",
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to create multi-day event: {str(e)}"
        )


@router.get("/all", summary="List all events")
async def fetch_all_events():
    try:
        # Check Web3 connection
        if not web3_manager.is_connected():
            raise HTTPException(
                status_code=503, detail="Blockchain connection unavailable"
            )
        total_num_of_events = web3_manager.event_manager.functions.eventCounter().call()
        event_holder = []
        for i in range(1, total_num_of_events + 1):
            try:
                ev = web3_manager.event_manager.functions.events(i).call()
                event_holder.append(
                    {
                        "id": int(ev[0]),
                        "organiser": ev[1],
                        "name": ev[2],
                        "venue": ev[3],
                        "date": int(ev[4]),
                        "ticketPrice": int(ev[5]),
                        "totalTickets": int(ev[6]),
                        "ticketsSold": int(ev[7]),
                        "isActive": bool(ev[8]),
                        "isMultiDay": bool(ev[9]),
                    }
                )
            except Exception:
                continue
        return event_holder

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to list ongoing events: {str(e)}"
        )


@router.post("/{event_id}/close", summary="Close event (organiser/admin only)")
def close_event(
    event_id: int, user_info: dict = Depends(require_roles(["admin", "organiser"]))
):
    try:
        # Check Web3 connection
        if not web3_manager.is_connected():
            raise HTTPException(
                status_code=503, detail="Blockchain connection unavailable"
            )

        total_num_of_events = web3_manager.event_manager.functions.eventCounter().call()
        if event_id <= 0 or event_id > total_num_of_events:
            raise HTTPException(status_code=400, detail="Invalid eventID")

        is_active = web3_manager.event_manager.functions.eventIsActive(event_id).call()
        if not is_active:
            return {
                "success": False,
                "message": "event already closed or not active",
                "event_id": event_id,
            }

        # ensure oracle signer is available in web3_manager
        signer = getattr(web3_manager, "oracle_account", None) or getattr(
            web3_manager, "oracle_private_key", None
        )
        if signer is None:
            raise HTTPException(
                status_code=500, detail="oracle signer not configured on server"
            )

        # build, sign and send tx
        try:
            fn_call = web3_manager.event_manager.functions.closeEvent(event_id)
            txn = web3_manager.build_transaction(fn_call)
            tx_hash = web3_manager.sign_and_send_transaction(txn)

            return {
                "success": True,
                "tx_hash": tx_hash.hex(),
                "message": f"Event '{event_id}' closed successfully",
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"failed to send tx: {e}")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to close events: {str(e)}")


@router.get("/{event_id}/details", summary="Get event details")
async def get_event_details(event_id: int):
    """Get details of a specific event (handles both regular and multi-day events)"""
    try:
        if not web3_manager.is_connected():
            raise HTTPException(
                status_code=503, detail="Blockchain connection unavailable"
            )

        if event_id <= 0:
            raise HTTPException(status_code=400, detail="Invalid event ID")

        # Get event details
        try:
            event = web3_manager.event_manager.functions.events(event_id).call()
            (
                event_id_ret,
                organiser,
                name,
                venue,
                date,
                ticket_price,
                total_tickets,
                tickets_sold,
                is_active,
                is_multi_day_flag,
            ) = event
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Event not found: {str(e)}")

        # Check if this is a multi-day event using the contract flag
        sub_events = []
        is_multi_day = is_multi_day_flag
        if is_multi_day:
            try:
                sub_event_ids = web3_manager.event_manager.functions.getSubEvents(
                    event_id
                ).call()
                for sub_event_id in sub_event_ids:
                    try:
                        sub_event = (
                            web3_manager.event_manager.functions.getSubEventDetails(
                                sub_event_id
                            ).call()
                        )
                        (
                            se_id,
                            parent_id,
                            day_index,
                            se_date,
                            se_venue,
                            se_swappable,
                            se_total_tickets,
                            se_tickets_sold,
                        ) = sub_event

                        sub_events.append(
                            {
                                "sub_event_id": se_id,
                                "day_index": day_index,
                                "date": se_date,
                                "venue": se_venue,
                                "tickets_sold": se_tickets_sold,
                                "tickets_available": se_total_tickets,
                                "tickets_remaining": se_total_tickets - se_tickets_sold,
                                "swappable": se_swappable,
                            }
                        )
                    except Exception as e:
                        print(
                            f"Warning: Could not get details for sub-event {sub_event_id}: {e}"
                        )
                        continue
            except Exception:
                # Error getting sub-events
                print(f"Warning: Could not get sub-events for event {event_id}")
                pass

        response = {
            "event_id": event_id_ret,
            "organiser": organiser,
            "name": name,
            "is_multi_day": is_multi_day,
            "ticket_price_wei": ticket_price,
            "ticket_price_eth": web3_manager.w3.from_wei(ticket_price, "ether"),
            "total_tickets": total_tickets,
            "tickets_sold": tickets_sold,
            "tickets_available": total_tickets - tickets_sold,
            "is_active": is_active,
        }

        if is_multi_day:
            # For multi-day events, the main event venue/date are not used
            response["sub_events"] = sub_events
            response["total_days"] = len(sub_events)
        else:
            # For regular events, include venue and date
            response["venue"] = venue
            response["date"] = date

        return response

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get event details: {str(e)}"
        )


@router.post("/buy", summary="Buy fresh tickets from event organiser")
async def buy_tickets(
    request: BuyTicketsRequest,
    user_info: dict = Depends(
        require_authenticated_user
    ),  # Authentication required, any role
):
    """Buy tickets - requires authentication but any role is allowed"""
    try:
        if not web3_manager.is_connected():
            raise HTTPException(
                status_code=503, detail="Blockchain connection unavailable"
            )

        if request.event_id <= 0:
            raise HTTPException(status_code=400, detail="Invalid event ID")

        if request.quantity <= 0:
            raise HTTPException(
                status_code=400, detail="Quantity must be greater than 0"
            )

        user_wallet_address = user_info["wallet_address"]
        user_private_key = user_info["private_key"]

        # Get event details to calculate total price
        try:
            event = web3_manager.event_manager.functions.events(request.event_id).call()
            (
                event_id,
                organiser,
                name,
                venue,
                date,
                ticket_price,
                total_tickets,
                tickets_sold,
                is_active,
                is_multi_day,
            ) = event
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Event not found: {str(e)}")

        # Validate event state
        if not is_active:
            raise HTTPException(status_code=400, detail="Event is not active")

        if tickets_sold + request.quantity > total_tickets:
            raise HTTPException(
                status_code=400,
                detail=f"Not enough tickets available. Only {total_tickets - tickets_sold} tickets left",
            )

        # Calculate total price
        total_price = ticket_price * request.quantity

        # Handle loyalty points redemption if requested
        loyalty_discount = 0
        points_redeemed = 0
        if request.use_loyalty_points:
            try:
                # Check if user has approved loyalty system
                allowance = web3_manager.get_points_allowance(user_wallet_address)
                points_available = web3_manager.preview_points_available(user_wallet_address, total_price)
                
                if points_available > 0:
                    if allowance < points_available:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Insufficient loyalty points allowance. Please approve LoyaltySystem first."
                        )
                    
                    # Redeem loyalty points for discount
                    oracle_account = web3_manager.get_user_account_by_index(0)
                    function_call = web3_manager.loyalty_system.functions.redeemPointsTicket(
                        web3_manager.w3.to_checksum_address(user_wallet_address),
                        int(total_price)
                    )
                    
                    txn = web3_manager.build_user_transaction(function_call, oracle_account, gas=200000)
                    redeem_tx_hash = web3_manager.sign_and_send_user_transaction(txn, oracle_account)
                    
                    # Get transaction receipt to parse events
                    receipt = web3_manager.w3.eth.wait_for_transaction_receipt(redeem_tx_hash)
                    redeem_events = web3_manager.loyalty_system.events.PointsRedeemedTicket().process_receipt(receipt)
                    
                    if redeem_events:
                        points_redeemed = redeem_events[0]["args"]["pointsBurned"]
                        loyalty_discount = redeem_events[0]["args"]["weiDiscount"]
                        
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to redeem loyalty points: {str(e)}")

        # Calculate final price after loyalty discount
        final_price = total_price - loyalty_discount

        # Get user account for this purchase
        user_account_obj = web3_manager.get_user_account(
            user_wallet_address, user_private_key
        )
        user_address = user_account_obj.address

        # Check user has enough ETH for FULL price (EventManager always charges full price)
        user_balance = web3_manager.get_account_balance(user_address)
        if user_balance < total_price:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient balance. Need {web3_manager.w3.from_wei(total_price, 'ether')} ETH for ticket purchase, have {web3_manager.w3.from_wei(user_balance, 'ether')} ETH. (Loyalty discount will be refunded after purchase)",
            )

        # Use regular buyTickets function - user pays FULL PRICE (EventManager requires original price)
        function_call = web3_manager.event_manager.functions.buyTickets(
            request.event_id, request.quantity
        )

        # Build and send the transaction from user account (ALWAYS pay full price to EventManager)
        txn = web3_manager.build_user_transaction(
            function_call, user_account_obj, gas=500000
        )
        txn["value"] = total_price  # EventManager expects original price, not discounted price

        tx_hash = web3_manager.sign_and_send_user_transaction(txn, user_account_obj)

        # If loyalty discount was applied, refund the discount to the user
        if loyalty_discount > 0:
            try:
                # Transfer the loyalty discount back to the user from oracle account
                oracle_account = web3_manager.get_user_account_by_index(0)
                
                # Send refund transaction
                refund_txn = {
                    'to': user_address,
                    'value': loyalty_discount,
                    'gas': 21000,
                    'gasPrice': web3_manager.w3.eth.gas_price,
                    'nonce': web3_manager.w3.eth.get_transaction_count(oracle_account.address),
                    'chainId': web3_manager.w3.eth.chain_id
                }
                
                signed_refund = oracle_account.sign_transaction(refund_txn)
                refund_tx_hash = web3_manager.w3.eth.send_raw_transaction(signed_refund.rawTransaction)
                
                print(f"✅ Loyalty refund sent: {refund_tx_hash.hex()} - {web3_manager.w3.from_wei(loyalty_discount, 'ether')} ETH")
                
            except Exception as e:
                print(f"⚠️ Warning: Failed to send loyalty discount refund: {str(e)}")
                # Don't fail the purchase if refund fails

        # Award loyalty points after successful ticket purchase
        loyalty_points_awarded = 0
        try:
            loyalty_points_awarded = web3_manager.award_loyalty_points(
                user_address, total_price
            )
        except Exception as e:
            # Log the error but don't fail the ticket purchase
            print(f"Warning: Failed to award loyalty points: {str(e)}")

        # Build response with loyalty information
        response = {
            "success": True,
            "tx_hash": tx_hash.hex(),
            "event_id": request.event_id,
            "quantity": request.quantity,
            "original_price_wei": total_price,
            "original_price_eth": web3_manager.w3.from_wei(total_price, "ether"),
            "final_price_wei": final_price,
            "final_price_eth": web3_manager.w3.from_wei(final_price, "ether"),
            "buyer_address": user_address,
            "loyalty_points_awarded": loyalty_points_awarded,
        }

        # Add loyalty redemption info if points were used
        if loyalty_discount > 0:
            response.update({
                "loyalty_points_redeemed": points_redeemed,
                "loyalty_discount_wei": loyalty_discount,
                "loyalty_discount_eth": web3_manager.w3.from_wei(loyalty_discount, "ether"),
                "message": f"Successfully purchased {request.quantity} ticket(s) for event {request.event_id}. Paid {web3_manager.w3.from_wei(total_price, 'ether')} ETH to EventManager, then received {web3_manager.w3.from_wei(loyalty_discount, 'ether')} ETH loyalty refund. Net cost: {web3_manager.w3.from_wei(final_price, 'ether')} ETH. Redeemed {points_redeemed} loyalty points. Awarded {loyalty_points_awarded} new loyalty points.",
            })
        else:
            response["message"] = f"Successfully purchased {request.quantity} ticket(s) for event {request.event_id}. User {user_address} paid and received NFTs. Awarded {loyalty_points_awarded} loyalty points."

        return response

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to buy tickets: {str(e)}")


@router.post("/sub-events/buy", summary="Buy tickets for a specific sub-event")
async def buy_sub_event_tickets(
    request: BuySubEventTicketsRequest,
    user_info: dict = Depends(
        require_authenticated_user
    ),  # Authentication required, any role
):
    """Buy tickets for a specific sub-event (multi-day events) - requires authentication"""
    try:
        if not web3_manager.is_connected():
            raise HTTPException(
                status_code=503, detail="Blockchain connection unavailable"
            )

        if request.sub_event_id <= 0:
            raise HTTPException(status_code=400, detail="Invalid sub-event ID")

        if request.quantity <= 0:
            raise HTTPException(
                status_code=400, detail="Quantity must be greater than 0"
            )

        user_wallet_address = user_info["wallet_address"]
        user_private_key = user_info["private_key"]

        # Get sub-event details
        try:
            sub_event = web3_manager.event_manager.functions.getSubEventDetails(
                request.sub_event_id
            ).call()
            (
                sub_event_id,
                parent_event_id,
                day_index,
                date,
                venue,
                swappable,
                total_tickets,
                tickets_sold,
            ) = sub_event

            # Get parent event for price
            parent_event = web3_manager.event_manager.functions.events(
                parent_event_id
            ).call()
            (
                event_id,
                organiser,
                name,
                _,  # venue (not used for sub-events)
                _,  # date (not used for sub-events)
                ticket_price,
                total_tickets,
                _,  # tickets_sold (tracked at sub-event level)
                is_active,
            ) = parent_event

        except Exception as e:
            raise HTTPException(
                status_code=404, detail=f"Sub-event not found: {str(e)}"
            )

        # Validate event state
        if not is_active:
            raise HTTPException(status_code=400, detail="Parent event is not active")

        if tickets_sold + request.quantity > total_tickets:
            raise HTTPException(
                status_code=400,
                detail=f"Not enough tickets available for this day. Only {total_tickets - tickets_sold} tickets left",
            )

        # Calculate total price
        total_price = ticket_price * request.quantity

        # Get user account for this purchase
        user_account_obj = web3_manager.get_user_account(
            user_wallet_address, user_private_key
        )
        user_address = user_account_obj.address

        # Check user has enough ETH
        user_balance = web3_manager.get_account_balance(user_address)
        if user_balance < total_price:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient balance. Need {web3_manager.w3.from_wei(total_price, 'ether')} ETH, have {web3_manager.w3.from_wei(user_balance, 'ether')} ETH",
            )

        # Use buySubEventTickets function
        function_call = web3_manager.event_manager.functions.buySubEventTickets(
            request.sub_event_id, request.quantity
        )

        # Build and send the transaction from user account
        txn = web3_manager.build_user_transaction(
            function_call, user_account_obj, gas=500000
        )
        txn["value"] = total_price

        tx_hash = web3_manager.sign_and_send_user_transaction(txn, user_account_obj)

        # Award loyalty points after successful ticket purchase
        loyalty_points_awarded = 0
        try:
            loyalty_points_awarded = web3_manager.award_loyalty_points(
                user_address, total_price
            )
        except Exception as e:
            # Log the error but don't fail the ticket purchase
            print(f"Warning: Failed to award loyalty points: {str(e)}")

        return {
            "success": True,
            "tx_hash": tx_hash.hex(),
            "sub_event_id": request.sub_event_id,
            "parent_event_id": parent_event_id,
            "event_name": name,
            "day_index": day_index,
            "venue": venue,
            "date": date,
            "quantity": request.quantity,
            "total_price_wei": total_price,
            "total_price_eth": web3_manager.w3.from_wei(total_price, "ether"),
            "buyer_address": user_address,
            "loyalty_points_awarded": loyalty_points_awarded,
            "message": f"Successfully purchased {request.quantity} ticket(s) for day {day_index + 1} of event '{name}'. Awarded {loyalty_points_awarded} loyalty points.",
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to buy sub-event tickets: {str(e)}"
        )


@router.post("/tickets/swap/check", summary="Check if two tickets can be swapped")
async def check_swap_eligibility(
    request: CheckSwapEligibilityRequest,
    user_info: dict = Depends(require_authenticated_user),
):
    """Check if two tickets are eligible for swapping"""
    try:
        if not web3_manager.is_connected():
            raise HTTPException(
                status_code=503, detail="Blockchain connection unavailable"
            )

        # Check if tickets can be swapped
        can_swap = web3_manager.event_manager.functions.canSwapTickets(
            request.ticket_id_1, request.ticket_id_2
        ).call()

        # Get ticket details for additional info
        try:
            ticket_1_sub_event = web3_manager.ticket_nft.functions.getSubEventId(
                request.ticket_id_1
            ).call()
            ticket_2_sub_event = web3_manager.ticket_nft.functions.getSubEventId(
                request.ticket_id_2
            ).call()

            parent_1 = web3_manager.event_manager.functions.getParentEventId(
                ticket_1_sub_event
            ).call()
            parent_2 = web3_manager.event_manager.functions.getParentEventId(
                ticket_2_sub_event
            ).call()

        except Exception:
            # If we can't get details, just return the basic check
            return {
                "can_swap": can_swap,
                "ticket_1_id": request.ticket_id_1,
                "ticket_2_id": request.ticket_id_2,
            }

        return {
            "can_swap": can_swap,
            "ticket_1_id": request.ticket_id_1,
            "ticket_2_id": request.ticket_id_2,
            "ticket_1_sub_event_id": ticket_1_sub_event,
            "ticket_2_sub_event_id": ticket_2_sub_event,
            "ticket_1_parent_event_id": parent_1,
            "ticket_2_parent_event_id": parent_2,
            "same_event": parent_1 == parent_2,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to check swap eligibility: {str(e)}"
        )


@router.post(
    "/tickets/swap/approve", summary="Approve EventManager for ticket swapping"
)
async def approve_for_swapping(
    user_info: dict = Depends(require_authenticated_user),
):
    """Approve the EventManager contract to manage user's tickets for swapping"""
    try:
        if not web3_manager.is_connected():
            raise HTTPException(
                status_code=503, detail="Blockchain connection unavailable"
            )

        user_wallet_address = user_info["wallet_address"]
        user_private_key = user_info["private_key"]

        # Get user account
        user_account_obj = web3_manager.get_user_account(
            user_wallet_address, user_private_key
        )

        # Approve EventManager for all tickets
        function_call = web3_manager.ticket_nft.functions.setApprovalForAll(
            web3_manager.event_manager.address, True
        )

        # Build and send the transaction from user account
        txn = web3_manager.build_user_transaction(
            function_call, user_account_obj, gas=100000
        )

        tx_hash = web3_manager.sign_and_send_user_transaction(txn, user_account_obj)

        return {
            "success": True,
            "tx_hash": tx_hash.hex(),
            "message": "Successfully approved EventManager for ticket swapping",
            "user_address": user_account_obj.address,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to approve for swapping: {str(e)}"
        )


@router.get(
    "/tickets/swap/approval-status",
    summary="Check if user has approved EventManager for swapping",
)
async def check_approval_status(
    user_info: dict = Depends(require_authenticated_user),
):
    """Check if user has approved the EventManager for ticket operations"""
    try:
        if not web3_manager.is_connected():
            raise HTTPException(
                status_code=503, detail="Blockchain connection unavailable"
            )

        user_wallet_address = user_info["wallet_address"]

        # Check approval status
        is_approved = web3_manager.event_manager.functions.isApprovedForSwapping(
            user_wallet_address
        ).call()

        return {
            "is_approved": is_approved,
            "user_address": user_wallet_address,
            "event_manager_address": web3_manager.event_manager.address,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to check approval status: {str(e)}"
        )


@router.post("/tickets/swap", summary="Swap two tickets between users")
async def swap_tickets(
    request: SwapTicketsRequest,
    user_info: dict = Depends(require_authenticated_user),
):
    """Swap two tickets - user must own one of the tickets and the other user must have approved the swap"""
    try:
        if not web3_manager.is_connected():
            raise HTTPException(
                status_code=503, detail="Blockchain connection unavailable"
            )

        user_wallet_address = user_info["wallet_address"]
        user_private_key = user_info["private_key"]

        # Validate that tickets can be swapped
        can_swap = web3_manager.event_manager.functions.canSwapTickets(
            request.ticket_id_1, request.ticket_id_2
        ).call()

        if not can_swap:
            raise HTTPException(
                status_code=400, detail="These tickets cannot be swapped"
            )

        # Get user account
        user_account_obj = web3_manager.get_user_account(
            user_wallet_address, user_private_key
        )

        # Verify ownership of one of the tickets
        owner_1 = web3_manager.ticket_nft.functions.ownerOf(request.ticket_id_1).call()
        owner_2 = web3_manager.ticket_nft.functions.ownerOf(request.ticket_id_2).call()

        user_owns_ticket_1 = owner_1.lower() == user_account_obj.address.lower()
        user_owns_ticket_2 = owner_2.lower() == user_account_obj.address.lower()

        if not (user_owns_ticket_1 or user_owns_ticket_2):
            raise HTTPException(
                status_code=400,
                detail="You must own one of the tickets to initiate a swap",
            )

        # Determine the other user
        other_user_address = owner_2 if user_owns_ticket_1 else owner_1

        # Validate that the provided other_user_address matches
        if other_user_address.lower() != request.other_user_address.lower():
            raise HTTPException(
                status_code=400, detail="Other user address doesn't match ticket owner"
            )

        # Execute the swap
        function_call = web3_manager.event_manager.functions.swapTickets(
            request.ticket_id_1, request.ticket_id_2, owner_1, owner_2
        )

        # Build and send the transaction from user account
        txn = web3_manager.build_user_transaction(
            function_call, user_account_obj, gas=200000
        )

        tx_hash = web3_manager.sign_and_send_user_transaction(txn, user_account_obj)

        return {
            "success": True,
            "tx_hash": tx_hash.hex(),
            "ticket_1_id": request.ticket_id_1,
            "ticket_2_id": request.ticket_id_2,
            "user_1_address": owner_1,
            "user_2_address": owner_2,
            "initiator": user_account_obj.address,
            "message": f"Successfully swapped tickets {request.ticket_id_1} and {request.ticket_id_2}",
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to swap tickets: {str(e)}")


@router.get(
    "/{event_id}/sub-events", summary="Get all sub-events for a multi-day event"
)
async def get_sub_events(event_id: int):
    """Get all sub-events for a multi-day event"""
    try:
        if not web3_manager.is_connected():
            raise HTTPException(
                status_code=503, detail="Blockchain connection unavailable"
            )

        if event_id <= 0:
            raise HTTPException(status_code=400, detail="Invalid event ID")

        # Get sub-events
        try:
            sub_event_ids = web3_manager.event_manager.functions.getSubEvents(
                event_id
            ).call()
        except Exception as e:
            raise HTTPException(
                status_code=404,
                detail=f"Event not found or has no sub-events: {str(e)}",
            )

        if not sub_event_ids:
            raise HTTPException(
                status_code=404, detail="No sub-events found for this event"
            )

        sub_events = []
        for sub_event_id in sub_event_ids:
            try:
                sub_event = web3_manager.event_manager.functions.getSubEventDetails(
                    sub_event_id
                ).call()
                (
                    se_id,
                    parent_id,
                    day_index,
                    se_date,
                    se_venue,
                    se_swappable,
                    se_total_tickets,
                    se_tickets_sold,
                ) = sub_event

                sub_events.append(
                    {
                        "sub_event_id": se_id,
                        "parent_event_id": parent_id,
                        "day_index": day_index,
                        "date": se_date,
                        "venue": se_venue,
                        "tickets_sold": se_tickets_sold,
                        "tickets_available": se_total_tickets,
                        "tickets_remaining": se_total_tickets - se_tickets_sold,
                        "swappable": se_swappable,
                    }
                )
            except Exception as e:
                print(
                    f"Warning: Could not get details for sub-event {sub_event_id}: {e}"
                )
                continue

        return {
            "event_id": event_id,
            "sub_events": sub_events,
            "total_sub_events": len(sub_events),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get sub-events: {str(e)}"
        )


@router.get(
    "/sub-events/{sub_event_id}/details", summary="Get details of a specific sub-event"
)
async def get_sub_event_details(sub_event_id: int):
    """Get details of a specific sub-event"""
    try:
        if not web3_manager.is_connected():
            raise HTTPException(
                status_code=503, detail="Blockchain connection unavailable"
            )

        if sub_event_id <= 0:
            raise HTTPException(status_code=400, detail="Invalid sub-event ID")

        # Get sub-event details
        try:
            sub_event = web3_manager.event_manager.functions.getSubEventDetails(
                sub_event_id
            ).call()
            (
                se_id,
                parent_id,
                day_index,
                se_date,
                se_venue,
                se_swappable,
                se_total_tickets,
                se_tickets_sold,
            ) = sub_event

            # Get parent event for additional info
            parent_event = web3_manager.event_manager.functions.events(parent_id).call()
            (
                event_id,
                organiser,
                name,
                _,  # venue (not used for sub-events)
                _,  # date (not used for sub-events)
                ticket_price,
                total_tickets,
                _,  # tickets_sold (tracked at sub-event level)
                is_active,
                _,  # isMultiDay (not needed here)
            ) = parent_event

        except Exception as e:
            raise HTTPException(
                status_code=404, detail=f"Sub-event not found: {str(e)}"
            )

        return {
            "sub_event_id": se_id,
            "parent_event_id": parent_id,
            "parent_event_name": name,
            "parent_event_organiser": organiser,
            "parent_event_active": is_active,
            "day_index": day_index,
            "date": se_date,
            "venue": se_venue,
            "tickets_sold": se_tickets_sold,
            "tickets_available": se_total_tickets,
            "tickets_remaining": se_total_tickets - se_tickets_sold,
            "swappable": se_swappable,
            "ticket_price_wei": ticket_price,
            "ticket_price_eth": web3_manager.w3.from_wei(ticket_price, "ether"),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get sub-event details: {str(e)}"
        )


@router.post(
    "/sub-events/{sub_event_id}/swappable",
    summary="Toggle swappable status of a sub-event (admin/organiser only)",
)
async def set_sub_event_swappable(
    sub_event_id: int,
    request: SetSubEventSwappableRequest,
    user_info: dict = Depends(require_roles(["admin", "organiser"])),
):
    """Set whether a sub-event's tickets are swappable - requires admin or organiser role"""
    try:
        if not web3_manager.is_connected():
            raise HTTPException(
                status_code=503, detail="Blockchain connection unavailable"
            )

        if sub_event_id <= 0:
            raise HTTPException(status_code=400, detail="Invalid sub-event ID")

        if request.sub_event_id != sub_event_id:
            raise HTTPException(status_code=400, detail="Sub-event ID mismatch")

        # Verify sub-event exists
        try:
            web3_manager.event_manager.functions.getSubEventDetails(sub_event_id).call()
        except Exception as e:
            raise HTTPException(
                status_code=404, detail=f"Sub-event not found: {str(e)}"
            )

        # Build transaction using web3_manager oracle account (only oracle can modify)
        function_call = web3_manager.event_manager.functions.setSubEventSwappable(
            sub_event_id, request.swappable
        )

        txn = web3_manager.build_transaction(function_call)
        tx_hash = web3_manager.sign_and_send_transaction(txn)

        return {
            "success": True,
            "tx_hash": tx_hash.hex(),
            "sub_event_id": sub_event_id,
            "swappable": request.swappable,
            "message": f"Sub-event {sub_event_id} swappable status set to {request.swappable}",
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to set sub-event swappable status: {str(e)}",
        )


@router.get(
    "/tickets/{ticket_id}/parent-event", summary="Get parent event ID for a ticket"
)
async def get_ticket_parent_event(ticket_id: int):
    """Get the parent event ID for a given ticket"""
    try:
        if not web3_manager.is_connected():
            raise HTTPException(
                status_code=503, detail="Blockchain connection unavailable"
            )

        if ticket_id <= 0:
            raise HTTPException(status_code=400, detail="Invalid ticket ID")

        # Get sub-event ID for the ticket
        try:
            sub_event_id = web3_manager.ticket_nft.functions.getSubEventId(
                ticket_id
            ).call()
            parent_event_id = web3_manager.event_manager.functions.getParentEventId(
                sub_event_id
            ).call()
            is_sub_event = web3_manager.event_manager.functions.isSubEvent(
                sub_event_id
            ).call()
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Ticket not found: {str(e)}")

        return {
            "ticket_id": ticket_id,
            "sub_event_id": sub_event_id,
            "parent_event_id": parent_event_id,
            "is_sub_event": is_sub_event,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get ticket parent event: {str(e)}"
        )
