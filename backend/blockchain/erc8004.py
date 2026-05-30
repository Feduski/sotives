"""
Integración ERC-8004 — Identity y Reputation Registry en Monad Testnet.

El agente validador de soTives registra su identidad on-chain y submitea
reputación después de cada resolución de compromiso.

Docs: https://docs.monad.xyz/guides/erc-8004
"""

import logging
from web3 import AsyncWeb3
from eth_account import Account

logger = logging.getLogger(__name__)

# ── Addresses en Monad Testnet ─────────────────────────────────────────────────
IDENTITY_REGISTRY_ADDRESS = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432"
REPUTATION_REGISTRY_ADDRESS = "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63"

# ── ABIs mínimos necesarios ────────────────────────────────────────────────────
IDENTITY_ABI = [
    {
        "name": "register",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [{"name": "metadataURI", "type": "string"}],
        "outputs": [],
    },
    {
        "name": "balanceOf",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "owner", "type": "address"}],
        "outputs": [{"name": "", "type": "uint256"}],
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "name": "from", "type": "address"},
            {"indexed": True, "name": "to", "type": "address"},
            {"indexed": True, "name": "tokenId", "type": "uint256"},
        ],
        "name": "Transfer",
        "type": "event",
    },
]

REPUTATION_ABI = [
    {
        "name": "giveFeedback",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "agentId", "type": "uint256"},
            {"name": "score", "type": "int128"},
            {"name": "feedbackType", "type": "uint8"},
            {"name": "tag", "type": "string"},
            {"name": "metadataURI", "type": "string"},
            {"name": "evidenceURI", "type": "string"},
            {"name": "comment", "type": "string"},
            {"name": "feedbackHash", "type": "bytes32"},
        ],
        "outputs": [],
    },
]

# Metadata del agente soTives subida a IPFS
AGENT_METADATA_URI = "ipfs://bafkreibdi6623n3xpf7ymk62ckb4bo75o3qemwkpfvp5i25j66itxvsoei"


class ERC8004Client:
    """
    Cliente para interactuar con los registros ERC-8004 en Monad Testnet.
    Se inicializa una sola vez y reutiliza la misma conexión que MonadClient.
    """

    def __init__(self, w3: AsyncWeb3, account: Account, chain_id: int):
        self.w3 = w3
        self.account = account
        self.chain_id = chain_id
        self.agent_id: int | None = None  # se setea después de registrar

        self.identity_registry = self.w3.eth.contract(
            address=self.w3.to_checksum_address(IDENTITY_REGISTRY_ADDRESS),
            abi=IDENTITY_ABI,
        )
        self.reputation_registry = self.w3.eth.contract(
            address=self.w3.to_checksum_address(REPUTATION_REGISTRY_ADDRESS),
            abi=REPUTATION_ABI,
        )

    async def _send_tx(self, fn) -> str:
        nonce = await self.w3.eth.get_transaction_count(self.account.address)
        tx = await fn.build_transaction({
            "from": self.account.address,
            "nonce": nonce,
            "gasPrice": await self.w3.eth.gas_price,
            "chainId": self.chain_id,
        })
        signed = self.account.sign_transaction(tx)
        tx_hash = await self.w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = await self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
        if receipt.status != 1:
            raise Exception(f"Tx reverted: {tx_hash.hex()}")
        return tx_hash.hex()

    async def is_registered(self) -> bool:
        """Verifica si el agente ya tiene un NFT en el Identity Registry."""
        try:
            balance = await self.identity_registry.functions.balanceOf(
                self.account.address
            ).call()
            return balance > 0
        except Exception as e:
            logger.warning(f"ERC8004: no se pudo verificar registro: {e}")
            return False

    async def _fetch_agent_id(self) -> int | None:
        """Lee el tokenId del último evento Transfer al address del agente."""
        try:
            latest = await self.w3.eth.block_number
            from_block = max(0, latest - 10000)
            logs = await self.w3.eth.get_logs({
                "address": self.w3.to_checksum_address(IDENTITY_REGISTRY_ADDRESS),
                "fromBlock": from_block,
                "toBlock": "latest",
                "topics": [
                    self.w3.keccak(text="Transfer(address,address,uint256)").hex(),
                    None,
                    "0x" + self.account.address[2:].zfill(64),
                ],
            })
            if logs:
                token_id = int(logs[-1]["topics"][3].hex(), 16)
                logger.info(f"ERC8004: agent_id encontrado — {token_id}")
                return token_id
        except Exception as e:
            logger.warning(f"ERC8004: no se pudo obtener agent_id: {e}")
        return None

    async def register_agent(self) -> str | None:
        """
        Registra el agente en el Identity Registry si aún no está registrado.
        Siempre intenta cargar el agent_id al finalizar.
        Retorna el tx hash o None si ya estaba registrado.
        """
        if await self.is_registered():
            logger.info("ERC8004: agente ya registrado en Identity Registry")
            self.agent_id = await self._fetch_agent_id()
            return None

        try:
            fn = self.identity_registry.functions.register(AGENT_METADATA_URI)
            tx_hash = await self._send_tx(fn)
            logger.info(f"ERC8004: agente registrado — tx: {tx_hash}")
            self.agent_id = await self._fetch_agent_id()
            return tx_hash
        except Exception as e:
            logger.error(f"ERC8004: error al registrar agente: {e}")
            return None

    async def submit_reputation(
        self,
        commitment_id: int,
        fulfilled: bool,
        reasoning: str = "",
    ) -> str | None:
        """
        Submitea reputación al Reputation Registry después de resolver un compromiso.
        No bloquea ni lanza excepción si falla — es opcional para el flujo principal.
        """
        if self.agent_id is None:
            logger.warning("ERC8004: agent_id no seteado, omitiendo reputación")
            return None

        tag = "commitment_fulfilled" if fulfilled else "commitment_failed"
        score = 100 if fulfilled else 0
        feedback_hash = self.w3.keccak(text=tag)

        try:
            fn = self.reputation_registry.functions.giveFeedback(
                self.agent_id,        # agentId
                score,                # score (int128)
                0,                    # feedbackType = general
                tag,                  # tag
                "",                   # metadataURI
                f"commitment:{commitment_id}",  # evidenceURI
                reasoning[:200],      # comment (truncado)
                feedback_hash,        # feedbackHash
            )
            tx_hash = await self._send_tx(fn)
            logger.info(f"ERC8004: reputación submitida — commitment {commitment_id}, tag: {tag}, tx: {tx_hash}")
            return tx_hash
        except Exception as e:
            # No propagamos el error — la reputación es best-effort
            logger.error(f"ERC8004: error al submitir reputación: {e}")
            return None
