"""Cliente Web3 para los contratos de soTives en Monad Testnet."""

from typing import Optional

from web3 import AsyncWeb3
from web3.middleware import ExtraDataToPOAMiddleware
from eth_account import Account

from config import settings
from .abis import COMMITMENT_MANAGER_ABI, COMMITMENT_POOL_ABI, GROUP_MULTISIG_ABI

STATUS_MAP = {0: "Active", 1: "EvidenceSubmitted", 2: "Fulfilled", 3: "Failed"}


class MonadClient:
    def __init__(self):
        self.w3 = AsyncWeb3(AsyncWeb3.AsyncHTTPProvider(settings.RPC_URL))
        self.w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)

        # Wallet del backend: solo firma resolveCommitment y markExpired como árbitro.
        # Los usuarios depositan desde sus propias wallets vía el frontend.
        self.account = Account.from_key(settings.VALIDATOR_PRIVATE_KEY)

        self.commitment_manager = self.w3.eth.contract(
            address=self.w3.to_checksum_address(settings.COMMITMENT_MANAGER_ADDRESS),
            abi=COMMITMENT_MANAGER_ABI,
        )
        self.commitment_pool = self.w3.eth.contract(
            address=self.w3.to_checksum_address(settings.COMMITMENT_POOL_ADDRESS),
            abi=COMMITMENT_POOL_ABI,
        )
        self.group_multisig = self.w3.eth.contract(
            address=self.w3.to_checksum_address(settings.MULTISIG_FACTORY_ADDRESS),
            abi=GROUP_MULTISIG_ABI,
        )

    # ── Helpers ────────────────────────────────────────────────────────────────

    async def _send_tx(self, fn, caller: Optional[Account] = None) -> str:
        """Construye, firma y envía una transacción. Retorna tx hash."""
        acct = caller or self.account
        nonce = await self.w3.eth.get_transaction_count(acct.address)
        tx = await fn.build_transaction({
            "from": acct.address,
            "nonce": nonce,
            "gasPrice": await self.w3.eth.gas_price,
            "chainId": settings.CHAIN_ID,
        })
        signed = acct.sign_transaction(tx)
        tx_hash = await self.w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = await self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
        if receipt.status != 1:
            raise Exception(f"Tx reverted: {tx_hash.hex()}")
        return tx_hash.hex()

    # ── CommitmentManager ──────────────────────────────────────────────────────

    async def get_commitment(self, commitment_id: int) -> dict:
        c = await self.commitment_manager.functions.getCommitment(commitment_id).call()
        return {
            "id": commitment_id,
            "creator": c[0],
            "deadline": c[1],
            "total_funds_wei": c[2],
            "total_funds_mon": float(self.w3.from_wei(c[2], "ether")),
            "status": STATUS_MAP.get(c[3], "Unknown"),
            "goal": c[4],
            "criteria": c[5],
            "evidence_type": c[6],
            "evidence_hash": c[7].hex(),
            "group_id": c[8],
        }

    async def get_user_commitments(self, address: str) -> list[dict]:
        addr = self.w3.to_checksum_address(address)
        ids = await self.commitment_manager.functions.getUserCommitments(addr).call()
        result = []
        for cid in ids:
            c = await self.get_commitment(cid)
            result.append(c)
        return result

    async def get_contribution(self, commitment_id: int, address: str) -> float:
        addr = self.w3.to_checksum_address(address)
        wei = await self.commitment_manager.functions.getContribution(commitment_id, addr).call()
        return float(self.w3.from_wei(wei, "ether"))

    async def get_reputation(self, address: str) -> int:
        addr = self.w3.to_checksum_address(address)
        return await self.commitment_manager.functions.reputation(addr).call()

    async def get_next_commitment_id(self) -> int:
        return await self.commitment_manager.functions.nextCommitmentId().call()

    async def get_all_commitments(self, max_scan: int = 300) -> list[dict]:
        """Itera todos los IDs creados y retorna sus datos. Ignora los que fallen."""
        try:
            next_id = await self.get_next_commitment_id()
        except Exception:
            return []
        result = []
        for cid in range(0, min(next_id, max_scan)):
            try:
                result.append(await self.get_commitment(cid))
            except Exception:
                continue
        return result

    async def get_ai_agent(self) -> str:
        return await self.commitment_manager.functions.aiAgent().call()

    async def resolve_commitment(self, commitment_id: int, fulfilled: bool) -> str:
        """Llamado por el backend como árbitro IA tras validar evidencia."""
        fn = self.commitment_manager.functions.resolveCommitment(commitment_id, fulfilled)
        return await self._send_tx(fn)

    async def mark_expired(self, commitment_id: int) -> str:
        """Marca como fallido un compromiso vencido sin evidencia."""
        fn = self.commitment_manager.functions.markExpired(commitment_id)
        return await self._send_tx(fn)

    # ── CommitmentPool ─────────────────────────────────────────────────────────

    async def get_pool_total(self) -> float:
        wei = await self.commitment_pool.functions.totalFunds().call()
        return float(self.w3.from_wei(wei, "ether"))

    # ── GroupMultisig ──────────────────────────────────────────────────────────

    async def get_next_group_id(self) -> int:
        return await self.group_multisig.functions.nextGroupId().call()

    async def get_group(self, group_id: int) -> dict:
        name, members, required = await self.group_multisig.functions.getGroup(group_id).call()
        return {"group_id": group_id, "name": name, "members": members, "required_signatures": required}

    async def is_member(self, group_id: int, address: str) -> bool:
        addr = self.w3.to_checksum_address(address)
        return await self.group_multisig.functions.isMember(group_id, addr).call()

    async def get_proposal(self, proposal_id: int) -> dict:
        p = await self.group_multisig.functions.getProposal(proposal_id).call()
        status_map = {0: "Pending", 1: "Executed", 2: "Cancelled"}
        action_map = {0: "AddMember", 1: "RemoveMember", 2: "CreateCommitment"}
        return {
            "proposal_id": proposal_id,
            "group_id": p[0],
            "action_type": action_map.get(p[1], str(p[1])),
            "data": p[2].hex(),
            "approvals": p[3],
            "status": status_map.get(p[4], "Unknown"),
            "proposer": p[5],
        }

    async def propose_group_action(self, group_id: int, action_type: int, data: bytes, private_key: str) -> str:
        caller = Account.from_key(private_key)
        fn = self.group_multisig.functions.proposeAction(group_id, action_type, data)
        return await self._send_tx(fn, caller)

    async def approve_proposal(self, group_id: int, proposal_id: int, private_key: str) -> str:
        caller = Account.from_key(private_key)
        fn = self.group_multisig.functions.approveProposal(group_id, proposal_id)
        return await self._send_tx(fn, caller)
