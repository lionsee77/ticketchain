import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class Config:
    """Configuration class for environment variables"""

    # Blockchain configuration
    RPC_URL = os.getenv("RPC_URL", "http://localhost:8545")
    ORACLE_PRIVATE_KEY = os.getenv("ORACLE_PRIVATE_KEY")
    EVENT_MANAGER_ADDRESS = os.getenv("EVENT_MANAGER_ADDRESS")
    RESALE_MARKET_ADDRESS = os.getenv("RESALE_MARKET_ADDRESS")
    LOYALTY_POINT_ADDRESS = os.getenv("LOYALTY_POINT_ADDRESS")
    LOYALTY_SYSTEM_ADDRESS = os.getenv("LOYALTY_SYSTEM_ADDRESS")
    TICKET_NFT_ADDRESS = os.getenv("TICKET_NFT_ADDRESS")

    # Contract ABI file paths
    EVENT_MANAGER_ABI_FILE = "EventManagerABI.json"
    RESALE_MARKET_ABI_FILE = "ResaleMarketABI.json"
    LOYALTY_POINT_ABI_FILE = "LoyaltyPointABI.json"
    LOYALTY_SYSTEM_ABI_FILE = "LoyaltySystemABI.json"
    TICKET_NFT_ABI_FILE = "TicketNFTABI.json"

    # Blockchain settings
    DEFAULT_GAS = 300000
    DEFAULT_GAS_PRICE_GWEI = "10"

    # Database configuration
    DATABASE_URL = os.getenv(
        "DATABASE_URL", "postgresql://user:password@localhost:5432/ticketchain"
    )

    # Redis configuration
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
    REDIS_DB = int(os.getenv("REDIS_DB", "0"))

    # Authentication settings
    SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

    @classmethod
    def validate_required_env_vars(cls):
        """Validate that all required environment variables are set"""
        required_vars = [
            ("ORACLE_PRIVATE_KEY", cls.ORACLE_PRIVATE_KEY),
            ("EVENT_MANAGER_ADDRESS", cls.EVENT_MANAGER_ADDRESS),
            ("RESALE_MARKET_ADDRESS", cls.RESALE_MARKET_ADDRESS),
            ("LOYALTY_POINT_ADDRESS", cls.LOYALTY_POINT_ADDRESS),
            ("LOYALTY_SYSTEM_ADDRESS", cls.LOYALTY_SYSTEM_ADDRESS),
            ("TICKET_NFT_ADDRESS", cls.TICKET_NFT_ADDRESS),
        ]

        missing_vars = []
        for var_name, var_value in required_vars:
            if not var_value:
                missing_vars.append(var_name)

        if missing_vars:
            raise ValueError(
                f"Missing required environment variables: {', '.join(missing_vars)}"
            )

        return True


# Create a singleton instance
config = Config()
