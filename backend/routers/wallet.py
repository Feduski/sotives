"""
Perfil de wallet — datos on-chain para la página de perfil.

Funciona en dos capas:
  1. Sin contratos: balance MON y conteo de transacciones siempre disponibles.
  2. Con contratos deployados: suma reputación y lista de compromisos del usuario.
"""

from fastapi import APIRouter, HTTPException, Depends

from blockchain import MonadClient
from dependencies import get_monad_client

router = APIRouter(prefix="/wallet", tags=["wallet"])


@router.get("/{address}")
async def get_wallet_profile(
    address: str,
    client: MonadClient = Depends(get_monad_client),
):
    """
    Retorna el perfil on-chain completo de una wallet.

    Campos siempre presentes (solo necesita RPC):
      - address, balance_mon, transaction_count

    Campos opcionales (requieren contratos deployados):
      - reputation, commitments, stats
      Si los contratos no están deployados se devuelven vacíos/0 sin error.
    """
    try:
        checksum = client.w3.to_checksum_address(address)
    except Exception:
        raise HTTPException(status_code=400, detail="Dirección inválida")

    # ── Datos que solo necesitan el RPC (siempre disponibles) ─────────────────
    balance_wei = await client.w3.eth.get_balance(checksum)
    balance_mon = float(client.w3.from_wei(balance_wei, "ether"))
    tx_count = int(await client.w3.eth.get_transaction_count(checksum))

    # ── Datos de contratos (silenciamos errores si no están deployados) ───────
    reputation: int = 0
    commitments: list[dict] = []

    try:
        reputation = int(await client.get_reputation(checksum))
    except Exception:
        pass

    try:
        commitments = await client.get_user_commitments(checksum)
    except Exception:
        pass

    # ── Stats calculados desde los compromisos ────────────────────────────────
    active    = [c for c in commitments if c.get("status") in ("Active", "EvidenceSubmitted")]
    fulfilled = [c for c in commitments if c.get("status") == "Fulfilled"]
    failed    = [c for c in commitments if c.get("status") == "Failed"]
    total_staked = sum(float(c.get("total_funds_mon", 0)) for c in commitments)
    total = len(commitments)
    completion_rate = round(len(fulfilled) / total * 100) if total else 0

    return {
        "address": checksum,
        "balance_mon": round(balance_mon, 6),
        "transaction_count": tx_count,
        "reputation": reputation,
        "commitments": commitments,
        "stats": {
            "total_commitments": total,
            "active": len(active),
            "fulfilled": len(fulfilled),
            "failed": len(failed),
            "total_staked_mon": round(total_staked, 4),
            "completion_rate": completion_rate,
        },
    }
