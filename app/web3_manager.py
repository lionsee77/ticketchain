import json
from web3 import Web3
from config import config

# Hardhat test account private keys
HARDHAT_ACCOUNTS = {
    0: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    1: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    2: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
    3: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
    4: "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
    5: "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
    6: "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
    7: "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356",
    8: "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97",
    9: "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6",
}

# Corresponding addresses (for reference)
HARDHAT_ADDRESSES = {
    0: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    1: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    2: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    3: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    4: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    5: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
    6: "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
    7: "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
    8: "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
    9: "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",
}


class Web3Manager:
    """Manager class for Web3 connection and contract interactions"""

    def __init__(self):
        # Validate environment variables
        config.validate_required_env_vars()

        # Initialize Web3 connection
        self.w3 = Web3(Web3.HTTPProvider(config.RPC_URL))

        # Initialize oracle account
        self.oracle_account = self.w3.eth.account.from_key(config.ORACLE_PRIVATE_KEY)

        # Load contract ABI and initialize contract
        self.event_manager_abi = self._load_contract_abi(
            "EventManager", config.EVENT_MANAGER_ABI_FILE
        )
        self.resale_market_abi = self._load_contract_abi(
            "ResaleMarket", config.RESALE_MARKET_ABI_FILE
        )
        self.loyalty_point_abi = self._load_contract_abi(
            "LoyaltyPoint", config.LOYALTY_POINT_ABI_FILE
        )
        self.loyalty_system_abi = self._load_contract_abi(
            "LoyaltySystem", config.LOYALTY_SYSTEM_ABI_FILE
        )
        self.ticket_nft_abi = self._load_contract_abi(
            "TicketNFT", config.TICKET_NFT_ABI_FILE
        )

        if not config.EVENT_MANAGER_ADDRESS:
            raise ValueError("EVENT_MANAGER_ADDRESS is required")

        if not config.RESALE_MARKET_ADDRESS:
            raise ValueError("RESALE_MARKET_ADDRESS is required")

        if not config.LOYALTY_POINT_ADDRESS:
            raise ValueError("LOYALTY_POINT_ADDRESS is required")

        if not config.LOYALTY_SYSTEM_ADDRESS:
            raise ValueError("LOYALTY_SYSTEM_ADDRESS is required")

        if not config.TICKET_NFT_ADDRESS:
            raise ValueError("TICKET_NFT_ADDRESS is required")

        self.event_manager = self.w3.eth.contract(
            address=self.w3.to_checksum_address(config.EVENT_MANAGER_ADDRESS),
            abi=self.event_manager_abi,
        )
        self.market_manager = self.w3.eth.contract(
            address=self.w3.to_checksum_address(config.RESALE_MARKET_ADDRESS),
            abi=self.resale_market_abi,
        )
        self.loyalty_point = self.w3.eth.contract(
            address=self.w3.to_checksum_address(config.LOYALTY_POINT_ADDRESS),
            abi=self.loyalty_point_abi,
        )
        self.loyalty_system = self.w3.eth.contract(
            address=self.w3.to_checksum_address(config.LOYALTY_SYSTEM_ADDRESS),
            abi=self.loyalty_system_abi,
        )
        self.ticket_nft = self.w3.eth.contract(
            address=self.w3.to_checksum_address(config.TICKET_NFT_ADDRESS),
            abi=self.ticket_nft_abi,
        )

    def _load_contract_abi(self, contract_name, fallback_filename):
        """Generic method to load any contract ABI with shared volume priority"""
        shared_abi_path = f"/app/contracts/{fallback_filename}"
        abi_paths = [shared_abi_path, fallback_filename]

        for i, abi_path in enumerate(abi_paths):
            try:
                with open(abi_path) as f:
                    if i == 0:
                        print(
                            f"✅ Loaded {contract_name} ABI from SHARED VOLUME: {abi_path}"
                        )
                    else:
                        print(
                            f"⚠️  Loaded {contract_name} ABI from FALLBACK location: {abi_path}"
                        )
                    return json.load(f)
            except FileNotFoundError:
                if i == 0:
                    print(
                        f"❌ Shared volume {contract_name} ABI not found: {abi_path}, trying fallback..."
                    )
                continue
            except json.JSONDecodeError:
                raise ValueError(
                    f"Invalid JSON in {contract_name} ABI file: {abi_path}"
                )

        raise FileNotFoundError(
            f"{contract_name} ABI file not found in any of: {', '.join(abi_paths)}"
        )

    def is_connected(self):
        """Check if Web3 is connected to the blockchain"""
        return self.w3.is_connected()

    def get_transaction_count(self):
        """Get nonce for oracle account"""
        return self.w3.eth.get_transaction_count(self.oracle_account.address)

    def build_transaction(self, function_call, gas=None, gas_price_gwei=None):
        """Build a transaction with default parameters"""
        gas = gas or config.DEFAULT_GAS
        gas_price_gwei = gas_price_gwei or config.DEFAULT_GAS_PRICE_GWEI

        return function_call.build_transaction(
            {
                "from": self.oracle_account.address,
                "nonce": self.get_transaction_count(),
                "gas": gas,
                "gasPrice": self.w3.to_wei(gas_price_gwei, "gwei"),
            }
        )

    def sign_and_send_transaction(self, transaction):
        """Sign and send a transaction"""
        signed_txn = self.oracle_account.sign_transaction(transaction)
        # Handle different Web3.py versions - try both raw_transaction and rawTransaction
        raw_tx = getattr(
            signed_txn, "raw_transaction", getattr(signed_txn, "rawTransaction", None)
        )
        if raw_tx is None:
            raise ValueError("Could not access raw transaction data")
        tx_hash = self.w3.eth.send_raw_transaction(raw_tx)
        return tx_hash

    def get_user_account(self, wallet_address: str, private_key: str):
        """Get a user account object from wallet credentials"""
        account = self.w3.eth.account.from_key(private_key)
        if account.address.lower() != wallet_address.lower():
            raise ValueError("Private key does not match wallet address")
        return account

    def get_user_account_by_index(self, account_index: int):
        """Get a user account by index (0-9) for testing - legacy method"""
        if account_index not in HARDHAT_ACCOUNTS:
            raise ValueError(f"Account index {account_index} not available. Use 0-9.")

        private_key = HARDHAT_ACCOUNTS[account_index]
        return self.w3.eth.account.from_key(private_key)

    def get_user_account_from_credentials(self, wallet_address: str, private_key: str):
        """Get a user account object from wallet credentials (deprecated - use get_user_account)"""
        return self.get_user_account(wallet_address, private_key)

    def get_user_address_by_index(self, account_index: int):
        """Get user address by account index (legacy method for testing)"""
        if account_index not in HARDHAT_ADDRESSES:
            raise ValueError(f"Account index {account_index} not available. Use 0-9.")
        return HARDHAT_ADDRESSES[account_index]

    def get_test_accounts(self):
        """Get list of test accounts from Hardhat node"""
        return self.w3.eth.accounts

    def get_account_balance(self, address):
        """Get ETH balance of an account"""
        return self.w3.eth.get_balance(address)

    def build_user_transaction(
        self, function_call, user_account, gas=None, gas_price_gwei=None
    ):
        """Build a transaction for a specific user account"""
        gas = gas or config.DEFAULT_GAS
        gas_price_gwei = gas_price_gwei or config.DEFAULT_GAS_PRICE_GWEI

        return function_call.build_transaction(
            {
                "from": user_account.address,
                "nonce": self.w3.eth.get_transaction_count(user_account.address),
                "gas": gas,
                "gasPrice": self.w3.to_wei(gas_price_gwei, "gwei"),
            }
        )

    def sign_and_send_user_transaction(self, transaction, user_account):
        """Sign and send a transaction with a user account"""
        signed_txn = user_account.sign_transaction(transaction)
        # Handle different Web3.py versions - try both raw_transaction and rawTransaction
        raw_tx = getattr(
            signed_txn, "raw_transaction", getattr(signed_txn, "rawTransaction", None)
        )
        if raw_tx is None:
            raise ValueError("Could not access raw transaction data")
        tx_hash = self.w3.eth.send_raw_transaction(raw_tx)
        return tx_hash

    def get_points_balance(self, user_address: str) -> int:
        """Return LoyaltyPoint balance (token units) for a user."""
        if not hasattr(self, "loyalty_point"):
            raise RuntimeError("LoyaltyPoint contract not initialised")
        return self.loyalty_point.functions.balanceOf(
            self.w3.to_checksum_address(user_address)
        ).call()

    def get_points_allowance(self, owner: str) -> int:
        """Allowance that 'owner' has granted to the LoyaltySystem."""
        if not hasattr(self, "loyalty_point") or not hasattr(self, "loyalty_system"):
            raise RuntimeError("Loyalty contracts not initialised")
        return self.loyalty_point.functions.allowance(
            self.w3.to_checksum_address(owner),
            self.w3.to_checksum_address(self.loyalty_system.address),
        ).call()

    def preview_points_available(self, user_address: str, ticket_wei: int) -> int:
        """How many points can be redeemed (partial up to 30%) for a given ticket price."""
        if not hasattr(self, "loyalty_system"):
            raise RuntimeError("LoyaltySystem contract not initialised")
        return self.loyalty_system.functions.previewPointsAvailableForRedemption(
            self.w3.to_checksum_address(user_address), int(ticket_wei)
        ).call()

    def quote_wei_from_points(self, point_units: int) -> int:
        """Convert points -> wei using LoyaltySystem's current rate."""
        if not hasattr(self, "loyalty_system"):
            raise RuntimeError("LoyaltySystem contract not initialised")
        return self.loyalty_system.functions.quoteWeiFromPoints(int(point_units)).call()

    def award_loyalty_points(self, to_address: str, wei_amount: int) -> int:
        """Award loyalty points to a user based on wei amount spent."""
        if not hasattr(self, "loyalty_system"):
            raise RuntimeError("LoyaltySystem contract not initialised")

        # Use the oracle account to award points (oracle is authorized to mint points)
        oracle_account = self.get_user_account_by_index(
            0
        )  # Assuming oracle is account 0

        function_call = self.loyalty_system.functions.awardPoints(
            self.w3.to_checksum_address(to_address), int(wei_amount)
        )

        # Build and send the transaction from oracle account
        txn = self.build_user_transaction(function_call, oracle_account, gas=200000)
        tx_hash = self.sign_and_send_user_transaction(txn, oracle_account)

        # Get the transaction receipt to check if points were awarded
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)

        # Parse the PointsAwarded event to get the actual points minted
        points_awarded_event = (
            self.loyalty_system.events.PointsAwarded().process_receipt(receipt)
        )
        if points_awarded_event:
            return points_awarded_event[0]["args"]["pointsMinted"]
        return 0
    
    def redeem_loyalty_points_queue(self, to_address: str, point_redeemed: int) -> int:
        """Redeem loyalty points to a user based on amount requested."""
        if not hasattr(self, "loyalty_system"):
            raise RuntimeError("LoyaltySystem contract not initialised")

        # Use the oracle account to redeen points 
        oracle_account = self.get_user_account_by_index(
            0
        )  # Assuming oracle is account 0

        function_call = self.loyalty_system.functions.redeemPointsQueue(
            self.w3.to_checksum_address(to_address), int(point_redeemed)
        )

        # Build and send the transaction from oracle account
        txn = self.build_user_transaction(function_call, oracle_account, gas=200000)
        tx_hash = self.sign_and_send_user_transaction(txn, oracle_account)

        # Get the transaction receipt to check if points were redeemed
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)

        # Parse the PointsRedeemedQueue event to get the actual points burned
        points_redeem_queue_event = (
            self.loyalty_system.events.PointsRedeemedQueue().process_receipt(receipt)
        )
        if points_redeem_queue_event:
            return points_redeem_queue_event[0]["args"]["pointsBurned"]
        return 0

    def check_resale_market_approval(self, wallet_address: str) -> bool:
        """Check if user has approved ResaleMarket to transfer their tickets"""
        try:
            resale_market_address = self.market_manager.address
            # Convert to checksum address for Web3.py compatibility
            wallet_address_checksum = self.w3.to_checksum_address(wallet_address)

            # Check if user has approved ResaleMarket for all their tickets
            is_approved = self.ticket_nft.functions.isApprovedForAll(
                wallet_address_checksum, resale_market_address
            ).call()

            return is_approved
        except Exception as e:
            print(f"Error checking approval: {str(e)}")
            return False

    def check_resale_market_approval_by_index(self, user_account_index: int) -> bool:
        """Check if user has approved ResaleMarket to transfer their tickets by account index (legacy)"""
        try:
            user_address = self.get_user_address_by_index(user_account_index)
            return self.check_resale_market_approval(user_address)
        except Exception as e:
            print(f"Error checking approval: {str(e)}")
            return False

    def check_resale_market_approval_by_address(self, wallet_address: str) -> bool:
        """Check if user has approved ResaleMarket to transfer their tickets by wallet address (deprecated - use check_resale_market_approval)"""
        return self.check_resale_market_approval(wallet_address)

    def approve_resale_market(self, wallet_address: str, private_key: str):
        """Approve ResaleMarket to transfer user's tickets using wallet credentials"""
        try:
            user_account = self.get_user_account(wallet_address, private_key)
            resale_market_address = self.market_manager.address

            # Build setApprovalForAll transaction
            fn = self.ticket_nft.functions.setApprovalForAll(
                resale_market_address, True
            )
            txn = self.build_user_transaction(fn, user_account)
            tx_hash = self.sign_and_send_user_transaction(txn, user_account)

            return tx_hash
        except Exception as e:
            raise Exception(f"Failed to approve ResaleMarket: {str(e)}")

    def approve_resale_market_by_index(self, user_account_index: int):
        """Approve ResaleMarket to transfer user's tickets by account index (legacy)"""
        try:
            user_account = self.get_user_account_by_index(user_account_index)
            resale_market_address = self.market_manager.address

            # Build setApprovalForAll transaction
            fn = self.ticket_nft.functions.setApprovalForAll(
                resale_market_address, True
            )
            txn = self.build_user_transaction(fn, user_account)
            tx_hash = self.sign_and_send_user_transaction(txn, user_account)

            return tx_hash
        except Exception as e:
            raise Exception(f"Failed to approve ResaleMarket: {str(e)}")

    def approve_resale_market_by_credentials(
        self, wallet_address: str, private_key: str
    ):
        """Approve ResaleMarket to transfer user's tickets using wallet credentials (deprecated - use approve_resale_market)"""
        return self.approve_resale_market(wallet_address, private_key)

    def revoke_resale_market_approval(self, wallet_address: str, private_key: str):
        """Revoke ResaleMarket approval to transfer user's tickets"""
        try:
            user_account = self.get_user_account(wallet_address, private_key)
            resale_market_address = self.market_manager.address

            # Build setApprovalForAll transaction with False
            fn = self.ticket_nft.functions.setApprovalForAll(
                resale_market_address, False
            )
            txn = self.build_user_transaction(fn, user_account)
            tx_hash = self.sign_and_send_user_transaction(txn, user_account)

            return tx_hash
        except Exception as e:
            raise Exception(f"Failed to revoke ResaleMarket approval: {str(e)}")

    def revoke_resale_market_approval_by_index(self, user_account_index: int):
        """Revoke ResaleMarket approval to transfer user's tickets by account index (legacy)"""
        try:
            user_account = self.get_user_account_by_index(user_account_index)
            resale_market_address = self.market_manager.address

            # Build setApprovalForAll transaction with False
            fn = self.ticket_nft.functions.setApprovalForAll(
                resale_market_address, False
            )
            txn = self.build_user_transaction(fn, user_account)
            tx_hash = self.sign_and_send_user_transaction(txn, user_account)

            return tx_hash
        except Exception as e:
            raise Exception(f"Failed to revoke ResaleMarket approval: {str(e)}")


# Create a singleton instance
web3_manager = Web3Manager()
