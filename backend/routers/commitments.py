"""
Endpoints de compromisos — individuales y grupales.

Orden de rutas: las rutas con segmentos fijos (/public, /group/*, /next-id, /stats)
van ANTES que la ruta wildcard /{commitment_id}, para que FastAPI no las capture.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

import db
from agent import ValidatorAgent, EvidenceType
from blockchain import MonadClient
from dependencies import get_validator, get_monad_client

router = APIRouter(prefix="/commitments", tags=["commitments"])


# ─── Schemas ───────────────────────────────────────────────────────────────────

class ValidateRequest(BaseModel):
    commitment_id: int
    evidence_type: EvidenceType
    evidence_value: str
    auto_resolve: bool = True


class ValidationResponse(BaseModel):
    commitment_id: int
    fulfilled: bool
    confidence: float
    reasoning: str
    evidence_summary: str
    tx_hash: Optional[str] = None


# ─── Rutas fijas (antes del wildcard) ─────────────────────────────────────────

@router.get("/public")
async def get_public_commitments(
    limit: int = 50,
    offset: int = 0,
    client: MonadClient = Depends(get_monad_client),
):
    """Retorna todos los compromisos públicos (group_id == 0) ordenados por fondos."""
    all_c = await client.get_all_commitments()
    public = [c for c in all_c if c.get("group_id") == 0]
    public.sort(key=lambda c: c.get("total_funds_mon", 0), reverse=True)
    return {"commitments": public[offset : offset + limit], "total": len(public)}


@router.get("/group/{group_id}")
async def get_group_commitments(
    group_id: int,
    client: MonadClient = Depends(get_monad_client),
):
    """Retorna todos los compromisos que pertenecen a un grupo específico."""
    all_c = await client.get_all_commitments()
    group_c = [c for c in all_c if c.get("group_id") == group_id]
    return {"group_id": group_id, "commitments": group_c}


@router.get("/next-id")
async def get_next_commitment_id(
    client: MonadClient = Depends(get_monad_client),
):
    """Retorna el próximo ID de compromiso. Útil para el frontend antes de enviar la tx."""
    try:
        next_id = await client.get_next_commitment_id()
        return {"next_commitment_id": next_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_stats(
    client: MonadClient = Depends(get_monad_client),
):
    """Estadísticas globales: total en pool y cantidad de compromisos creados."""
    try:
        pool_total = await client.get_pool_total()
        next_id = await client.get_next_commitment_id()
        return {"total_commitments": next_id, "pool_total_mon": pool_total}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Wildcard /{commitment_id} ─────────────────────────────────────────────────

@router.get("/{commitment_id}/ai-result")
async def get_ai_result(commitment_id: int):
    """Retorna el último resultado del agente IA para un compromiso."""
    result = await db.get_last_result(commitment_id)
    if not result:
        raise HTTPException(status_code=404, detail="Sin resultado de IA para este compromiso")
    return result


@router.get("/{commitment_id}")
async def get_commitment(
    commitment_id: int,
    client: MonadClient = Depends(get_monad_client),
):
    """Lee el estado de un compromiso desde el contrato."""
    try:
        return await client.get_commitment(commitment_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/user/{address}")
async def get_user_commitments(
    address: str,
    client: MonadClient = Depends(get_monad_client),
):
    """Retorna los compromisos de un usuario con todos sus datos."""
    try:
        commitments = await client.get_user_commitments(address)
        return {"address": address, "commitments": commitments}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─── Validación ────────────────────────────────────────────────────────────────

@router.post("/validate", response_model=ValidationResponse)
async def validate_commitment(
    req: ValidateRequest,
    validator: ValidatorAgent = Depends(get_validator),
    client: MonadClient = Depends(get_monad_client),
):
    """
    Valida evidencia con IA y opcionalmente resuelve el compromiso on-chain.
    Persiste el resultado en SQLite para consulta posterior.
    """
    try:
        commitment = await client.get_commitment(req.commitment_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Compromiso no encontrado: {e}")

    if commitment["status"] not in ("Active", "EvidenceSubmitted"):
        raise HTTPException(
            status_code=400,
            detail=f"El compromiso ya fue resuelto (estado: {commitment['status']})",
        )

    result = await validator.validate(
        commitment_id=req.commitment_id,
        goal=commitment["goal"],
        criteria=commitment["criteria"],
        evidence_type=req.evidence_type,
        evidence_value=req.evidence_value,
    )

    tx_hash = None
    if req.auto_resolve:
        if result.confidence >= 0.75:
            try:
                tx_hash = await client.resolve_commitment(req.commitment_id, result.fulfilled)
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Validación OK pero fallo al resolver on-chain: {e}",
                )
        else:
            await db.save_result(
                req.commitment_id, result.fulfilled, result.confidence,
                result.reasoning, result.evidence_summary,
            )
            raise HTTPException(
                status_code=422,
                detail={
                    "message": "Confianza insuficiente para resolución automática",
                    "confidence": result.confidence,
                    "reasoning": result.reasoning,
                    "requires_manual_review": True,
                },
            )

    await db.save_result(
        req.commitment_id, result.fulfilled, result.confidence,
        result.reasoning, result.evidence_summary, tx_hash,
    )

    return ValidationResponse(
        commitment_id=result.commitment_id,
        fulfilled=result.fulfilled,
        confidence=result.confidence,
        reasoning=result.reasoning,
        evidence_summary=result.evidence_summary,
        tx_hash=tx_hash,
    )


@router.post("/validate/dry-run", response_model=ValidationResponse)
async def dry_run_validation(
    req: ValidateRequest,
    validator: ValidatorAgent = Depends(get_validator),
    client: MonadClient = Depends(get_monad_client),
):
    """Valida sin resolver on-chain. Para preview en UI antes de confirmar."""
    try:
        commitment = await client.get_commitment(req.commitment_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

    result = await validator.validate(
        commitment_id=req.commitment_id,
        goal=commitment["goal"],
        criteria=commitment["criteria"],
        evidence_type=req.evidence_type,
        evidence_value=req.evidence_value,
    )

    return ValidationResponse(
        commitment_id=result.commitment_id,
        fulfilled=result.fulfilled,
        confidence=result.confidence,
        reasoning=result.reasoning,
        evidence_summary=result.evidence_summary,
    )
