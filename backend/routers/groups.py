"""
Endpoints de grupos — compromisos con multifirma.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from blockchain import MonadClient
from dependencies import get_monad_client

router = APIRouter(prefix="/groups", tags=["groups"])


# ─── Rutas fijas ───────────────────────────────────────────────────────────────

@router.get("/next-id")
async def get_next_group_id(
    client: MonadClient = Depends(get_monad_client),
):
    """Retorna el próximo groupId. El frontend lo lee antes de llamar createGroup."""
    try:
        next_id = await client.get_next_group_id()
        return {"next_group_id": next_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Schemas ───────────────────────────────────────────────────────────────────

class ProposeActionRequest(BaseModel):
    group_id: int
    action_type: int  # 0=ADD_MEMBER, 1=REMOVE_MEMBER, 2=CREATE_COMMITMENT
    data_hex: str     # ABI-encoded data en hex
    caller_private_key: str  # en producción esto viene del wallet del frontend, no del backend


class ApproveProposalRequest(BaseModel):
    group_id: int
    proposal_id: int
    caller_private_key: str


# ─── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/{group_id}")
async def get_group(
    group_id: int,
    client: MonadClient = Depends(get_monad_client),
):
    """Lee el estado de un grupo desde el contrato."""
    try:
        group = await client.get_group(group_id)
        return {"group_id": group_id, **group}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{group_id}/member/{address}")
async def check_membership(
    group_id: int,
    address: str,
    client: MonadClient = Depends(get_monad_client),
):
    """Verifica si una address es miembro del grupo."""
    try:
        is_member = await client.is_member(group_id, address)
        return {"group_id": group_id, "address": address, "is_member": is_member}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{group_id}/propose")
async def propose_action(
    group_id: int,
    req: ProposeActionRequest,
    client: MonadClient = Depends(get_monad_client),
):
    """
    Propone una acción en el grupo (agregar miembro, crear compromiso grupal).
    Requiere que el caller sea miembro del grupo.

    NOTA: En producción, las transacciones las firma el wallet del usuario
    directamente desde el frontend. Este endpoint es para casos donde el
    backend actúa como intermediario autorizado.
    """
    try:
        data_bytes = bytes.fromhex(req.data_hex.removeprefix("0x"))
        tx_hash = await client.propose_group_action(
            req.group_id, req.action_type, data_bytes, req.caller_private_key
        )
        return {"tx_hash": tx_hash, "status": "proposed"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{group_id}/approve/{proposal_id}")
async def approve_proposal(
    group_id: int,
    proposal_id: int,
    req: ApproveProposalRequest,
    client: MonadClient = Depends(get_monad_client),
):
    """Un miembro del grupo aprueba una propuesta pendiente."""
    try:
        tx_hash = await client.approve_proposal(
            req.group_id, req.proposal_id, req.caller_private_key
        )
        return {"tx_hash": tx_hash, "status": "approved"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
