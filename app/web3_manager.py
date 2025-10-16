import json
from web3 import Web3
from config import config


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
        self.event_manager_abi = self._load_contract_abi()

        if not config.EVENT_MANAGER_ADDRESS:
            raise ValueError("EVENT_MANAGER_ADDRESS is required")

        self.event_manager = self.w3.eth.contract(
            address=self.w3.to_checksum_address(config.EVENT_MANAGER_ADDRESS),
            abi=self.event_manager_abi,
        )

    def _load_contract_abi(self):
        """Load contract ABI from file"""
        try:
            with open(config.EVENT_MANAGER_ABI_FILE) as f:
                return json.load(f)
        except FileNotFoundError:
            raise FileNotFoundError(
                f"Contract ABI file not found: {config.EVENT_MANAGER_ABI_FILE}"
            )
        except json.JSONDecodeError:
            raise ValueError(
                f"Invalid JSON in ABI file: {config.EVENT_MANAGER_ABI_FILE}"
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

    def get_test_accounts(self):
        """Get list of test accounts from Hardhat node"""
        return self.w3.eth.accounts

    def get_account_balance(self, address):
        """Get ETH balance of an account"""
        return self.w3.eth.get_balance(address)


# Create a singleton instance
web3_manager = Web3Manager()
