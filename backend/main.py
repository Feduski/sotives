from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from web3 import AsyncWeb3

from routers import commitments_router, groups_router, wallet_router
from config import settings

# Orígenes permitidos — el frontend en desarrollo y producción
ALLOWED_ORIGINS = [
    "http://localhost:3000",   # Next.js dev
    "http://localhost:5173",   # Vite dev (por si usan Vite)
    "https://sotives.vercel.app",  # producción (cambiar si cambia el dominio)
]

app = FastAPI(
    title="soTives API",
    description="Backend para la plataforma de compromisos verificables on Monad",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(commitments_router)
app.include_router(groups_router)
app.include_router(wallet_router)


@app.get("/health")
async def health():
    """
    Verifica el estado de todas las conexiones y variables de entorno.
    Útil para diagnosticar antes de probar el flujo completo.
    """
    checks = {}

    # Conexión RPC a Monad
    try:
        w3 = AsyncWeb3(AsyncWeb3.AsyncHTTPProvider(settings.RPC_URL))
        block = await w3.eth.block_number
        checks["monad_rpc"] = {"ok": True, "latest_block": block}
    except Exception as e:
        checks["monad_rpc"] = {"ok": False, "error": str(e)}

    # Wallet del validador
    if settings.VALIDATOR_PRIVATE_KEY:
        from eth_account import Account
        acct = Account.from_key(settings.VALIDATOR_PRIVATE_KEY)
        try:
            balance_wei = await w3.eth.get_balance(acct.address)
            balance_mon = w3.from_wei(balance_wei, "ether")
            checks["validator_wallet"] = {
                "ok": True,
                "address": acct.address,
                "balance_mon": float(balance_mon),
                "has_gas": float(balance_mon) > 0,
            }
        except Exception as e:
            checks["validator_wallet"] = {"ok": False, "error": str(e)}
    else:
        checks["validator_wallet"] = {"ok": False, "error": "VALIDATOR_PRIVATE_KEY no configurada"}

    # Contratos
    zero = "0x0000000000000000000000000000000000000000"
    checks["commitment_manager"] = {
        "ok": settings.COMMITMENT_MANAGER_ADDRESS != zero,
        "address": settings.COMMITMENT_MANAGER_ADDRESS,
    }
    checks["commitment_pool"] = {
        "ok": settings.COMMITMENT_POOL_ADDRESS != zero,
        "address": settings.COMMITMENT_POOL_ADDRESS,
    }
    checks["multisig_factory"] = {
        "ok": settings.MULTISIG_FACTORY_ADDRESS != zero,
        "address": settings.MULTISIG_FACTORY_ADDRESS,
    }

    # OpenAI
    checks["openai"] = {"ok": bool(settings.OPENAI_API_KEY)}

    # GitHub (opcional)
    checks["github_token"] = {
        "ok": True,
        "note": "configurado" if settings.GITHUB_TOKEN else "no configurado (solo repos públicos, 60 req/h)",
    }

    all_critical_ok = all([
        checks["monad_rpc"]["ok"],
        checks["validator_wallet"]["ok"],
        checks["commitment_manager"]["ok"],
        checks["openai"]["ok"],
    ])

    return {
        "status": "ready" if all_critical_ok else "degraded",
        "network": "monad-testnet",
        "chain_id": settings.CHAIN_ID,
        "checks": checks,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
