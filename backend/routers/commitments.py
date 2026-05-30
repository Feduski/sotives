"""
Endpoints de compromisos — individuales y grupales.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from agent import ValidatorAgent, EvidenceType
from blockchain import MonadClient
from dependencies import get_validator, get_monad_client

router = APIRouter(prefix="/commitments", tags=["commitments"])


# ─── Schemas ───────────────────────────────────────────────────────────────────

class SubmitEvidenceRequest(BaseModel):
    commitment_id: int
    evidence_type: EvidenceType
    evidence_value: str  # URL, texto, base64 del archivo


class ValidateRequest(BaseModel):
    commitment_id: int
    evidence_type: EvidenceType
    evidence_value: str
    auto_resolve: bool = True  # si True, llama al contrato automáticamente


class ValidationResponse(BaseModel):
    commitment_id: int
    fulfilled: bool
    confidence: float
    reasoning: str
    evidence_summary: str
    tx_hash: Optional[str] = None  # si se resolvió on-chain


# ─── Endpoints ─────────────────────────────────────────────────────────────────

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
    """Retorna estadísticas globales: total en pool y próximo ID (= cantidad de compromisos creados)."""
    try:
        pool_total = await client.get_pool_total()
        next_id = await client.get_next_commitment_id()
        return {
            "total_commitments": next_id,
            "pool_total_mon": pool_total,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate", response_model=ValidationResponse)
async def validate_commitment(
    req: ValidateRequest,
    validator: ValidatorAgent = Depends(get_validator),
    client: MonadClient = Depends(get_monad_client),
):
    """
    Valida evidencia con IA y opcionalmente resuelve el compromiso on-chain.
    Este es el endpoint principal del agente validador.
    """
    # 1. Leer el compromiso del contrato
    try:
        commitment = await client.get_commitment(req.commitment_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Compromiso no encontrado: {e}")

    if commitment["state"] not in ("ACTIVE", "EVIDENCE_SUBMITTED"):
        raise HTTPException(
            status_code=400,
            detail=f"El compromiso ya fue resuelto (estado: {commitment['state']})",
        )

    # 2. Validar con IA
    result = await validator.validate(
        commitment_id=req.commitment_id,
        goal=commitment["goal"],
        criteria=commitment["criteria"],
        evidence_type=req.evidence_type,
        evidence_value=req.evidence_value,
    )

    # 3. Resolver on-chain si auto_resolve está activado
    tx_hash = None
    if req.auto_resolve:
        # Solo resolvemos automáticamente si la confianza es alta
        if result.confidence >= 0.75:
            try:
                tx_hash = await client.resolve_commitment(
                    req.commitment_id, result.fulfilled
                )
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Validación OK pero fallo al resolver on-chain: {e}",
                )
        else:
            # Confianza baja → requiere revisión manual
            raise HTTPException(
                status_code=422,
                detail={
                    "message": "Confianza insuficiente para resolución automática",
                    "confidence": result.confidence,
                    "reasoning": result.reasoning,
                    "requires_manual_review": True,
                },
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
    """
    Valida evidencia sin resolver on-chain. Útil para el frontend para
    mostrarle al usuario el resultado antes de confirmar.
    """
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
