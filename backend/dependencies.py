"""Dependencias compartidas para los routers FastAPI."""

from functools import lru_cache
from agent import ValidatorAgent
from blockchain import MonadClient


@lru_cache
def get_validator() -> ValidatorAgent:
    return ValidatorAgent()


@lru_cache
def get_monad_client() -> MonadClient:
    return MonadClient()
