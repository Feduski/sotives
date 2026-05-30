"""
Cliente Web3 para interactuar con los contratos de soTives en Monad.
"""

from web3 import AsyncWeb3
from web3.middleware import ExtraDataToPOAMiddleware
from eth_account import Account

from config import settings
from .abis import COMMITMENT_MANAGER_ABI, GROUP_MULTISIG_ABI


class MonadClient:
    def __init__(self):
        self.w3 = AsyncWeb3(AsyncWeb3.AsyncHTTPProvider(settings.RPC_URL))
        self.w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
        # Wallet del backend: solo usada para firmar resolveCommitment como árbitro.
        # Los usuarios interactúan con el contrato directamente desde el frontend.
        self.account = Account.from_key(settings.VALIDATOR_PRIVATE_KEY)

        self.commitment_manager = self.w3.eth.contract(
            address=self.w3.to_checksum_address(settings.COMMITMENT_MANAGER_ADDRESS),
            abi=COMMITMENT_MANAGER_ABI,
        )
        self.group_multisig = self.w3.eth.contract(
            address=self.w3.to_checksum_address(settings.MULTISIG_FACTORY_ADDRESS),
            abi=GROUP_MULTISIG_ABI,
        )

    async def resolve_commitment(self, commitment_id: int, fulfilled: bool) -> str:
        """Llama resolveCommitment en el contrato. Retorna el tx hash."""
        nonce = await self.w3.eth.get_transaction_count(self.account.address)
        gas_price = await self.w3.eth.gas_price

        tx = await self.commitment_manager.functions.resolveCommitment(
            commitment_id, fulfilled
        ).build_transaction(
            {
                "from": self.account.address,
                "nonce": nonce,
                "gasPrice": gas_price,
                "chainId": settings.CHAIN_ID,
            }
        )

        signed = self.account.sign_transaction(tx)
        tx_hash = await self.w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = await self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)

        if receipt.status != 1:
            raise Exception(f"Tx reverted: {tx_hash.hex()}")

        return tx_hash.hex()

    async def get_commitment(self, commitment_id: int) -> dict:
        """Lee un compromiso del contrato."""
        result = await self.commitment_manager.functions.getCommitment(commitment_id).call()
        state_map = {0: "ACTIVE", 1: "EVIDENCE_SUBMITTED", 2: "FULFILLED", 3: "FAILED"}
        return {
            "owner": result[0],
            "goal": result[1],
            "deadline": result[2],
            "criteria": result[3],
            "evidence_type": result[4],
            "stake": self.w3.from_wei(result[5], "ether"),
            "state": state_map.get(result[6], "UNKNOWN"),
            "group_id": result[7],
        }

    async def get_user_commitments(self, address: str) -> list[int]:
        """Retorna los IDs de compromisos de un usuario."""
        addr = self.w3.to_checksum_address(address)
        return await self.commitment_manager.functions.getUserCommitments(addr).call()

    async def get_group(self, group_id: int) -> dict:
        """Lee un grupo del contrato multisig."""
        result = await self.group_multisig.functions.getGroup(group_id).call()
        return {
            "name": result[0],
            "members": result[1],
            "required_signatures": result[2],
            "commitment_ids": result[3],
        }

    async def is_member(self, group_id: int, address: str) -> bool:
        addr = self.w3.to_checksum_address(address)
        return await self.group_multisig.functions.isMember(group_id, addr).call()

    async def propose_group_action(
        self, group_id: int, action_type: int, data: bytes, private_key: str
    ) -> str:
        """Propone una acción en el grupo (add member, create commitment, etc)."""
        caller = Account.from_key(private_key)
        nonce = await self.w3.eth.get_transaction_count(caller.address)

        tx = await self.group_multisig.functions.proposeAction(
            group_id, action_type, data
        ).build_transaction(
            {
                "from": caller.address,
                "nonce": nonce,
                "gasPrice": await self.w3.eth.gas_price,
                "chainId": settings.CHAIN_ID,
            }
        )
        signed = caller.sign_transaction(tx)
        tx_hash = await self.w3.eth.send_raw_transaction(signed.raw_transaction)
        await self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
        return tx_hash.hex()

    async def approve_proposal(
        self, group_id: int, proposal_id: int, private_key: str
    ) -> str:
        """Un miembro del grupo aprueba una propuesta."""
        caller = Account.from_key(private_key)
        nonce = await self.w3.eth.get_transaction_count(caller.address)

        tx = await self.group_multisig.functions.approveProposal(
            group_id, proposal_id
        ).build_transaction(
            {
                "from": caller.address,
                "nonce": nonce,
                "gasPrice": await self.w3.eth.gas_price,
                "chainId": settings.CHAIN_ID,
            }
        )
        signed = caller.sign_transaction(tx)
        tx_hash = await self.w3.eth.send_raw_transaction(signed.raw_transaction)
        await self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
        return tx_hash.hex()
