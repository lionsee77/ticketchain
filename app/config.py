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

    # Contract ABI file path
    EVENT_MANAGER_ABI_FILE = "EventManagerABI.json"

    # Blockchain settings
    DEFAULT_GAS = 300000
    DEFAULT_GAS_PRICE_GWEI = "10"

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
