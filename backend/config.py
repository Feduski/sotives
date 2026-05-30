from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Monad Testnet
    RPC_URL: str = "https://testnet-rpc.monad.xyz"
    CHAIN_ID: int = 10143

    # Wallet del backend — solo firma resolveCommitment como árbitro.
    # Los usuarios depositan desde sus propias wallets vía el frontend.
    VALIDATOR_PRIVATE_KEY: str = ""

    # Contracts (se llenan después del deploy)
    COMMITMENT_MANAGER_ADDRESS: str = "0x0000000000000000000000000000000000000000"
    MULTISIG_FACTORY_ADDRESS: str = "0x0000000000000000000000000000000000000000"

    # AI
    OPENAI_API_KEY: str = ""

    # GitHub: opcional para repos públicos (sin token = 60 req/h, con token = 5000 req/h)
    GITHUB_TOKEN: str = ""

    # Twitter/X: obligatorio para leer tweets via API v2
    TWITTER_BEARER_TOKEN: str = ""

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
