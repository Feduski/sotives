# AGENT.md — soTives (Monad Hackathon)

## Proyecto

**soTives** es una plataforma de compromisos verificables con incentivos económicos on-chain.
Los usuarios crean compromisos con stake en MON, la IA valida el cumplimiento con evidencia, y los fondos se distribuyen automáticamente mediante smart contracts.

Repo: https://github.com/jeremiasdavison/soTives.git  
Notion: https://www.notion.so/Monad-Hackaton-So-tives-3709033c0596805dabfeca658c3befd9

---

## Red — Monad Testnet

| Parámetro    | Valor                            |
|-------------|----------------------------------|
| Chain ID    | 10143                            |
| RPC         | https://testnet-rpc.monad.xyz    |
| Explorer    | https://testnet.monadexplorer.com |
| Faucet      | https://faucet.monad.xyz         |
| Docs        | https://docs.monad.xyz           |

> Para Foundry/Solidity ver `/monad.md` — tiene snippets completos de deploy y verificación.

---

## Stack

| Capa       | Tecnología                          |
|------------|-------------------------------------|
| Smart Contracts | Solidity 0.8.28 + Foundry (en `/contracts`) |
| Backend    | Python (`/backend`) — API + lógica IA |
| Frontend   | `/frontend`                         |
| IA         | LLM para validación de evidencia    |
| Blockchain | Monad Testnet (EVM compatible)      |

---

## Entorno de trabajo

El trabajo principal se hace en `/backend`.

```
/backend
  main.py                      ← FastAPI entry point (uvicorn)
  config.py                    ← Settings via pydantic-settings + .env
  dependencies.py              ← Singletons inyectados en los routers
  requirements.txt
  .env.example                 ← Copiar a .env y llenar

  agent/
    __init__.py
    validator.py               ← ValidatorAgent — LLM + extractores de evidencia

  blockchain/
    __init__.py
    client.py                  ← MonadClient — web3.py async
    abis.py                    ← ABIs de CommitmentManager y GroupMultisig

  routers/
    __init__.py
    commitments.py             ← GET /commitments/{id}, POST /commitments/validate
    groups.py                  ← GET /groups/{id}, POST /groups/{id}/propose
```

Para correr el backend:
```bash
cd /Users/jeremiasdavison/Desktop/Monad/backend
pip install -r requirements.txt
cp .env.example .env   # llenar con keys reales
uvicorn main:app --reload
# → http://localhost:8000
# → http://localhost:8000/docs  (Swagger UI)
```

Variables de entorno necesarias (`.env` en `/backend`):
```
PRIVATE_KEY=       # wallet del backend para llamar resolveCommitment
RPC_URL=https://testnet-rpc.monad.xyz
CHAIN_ID=10143
COMMITMENT_MANAGER_ADDRESS=   # tras deploy del contrato
MULTISIG_FACTORY_ADDRESS=     # tras deploy del contrato
OPENAI_API_KEY=               # para el agente validador
GITHUB_TOKEN=                 # para leer repos privados (opcional)
TWITTER_BEARER_TOKEN=         # para validar tweets (opcional)
```

---

## Arquitectura Core

### Smart Contract: `CommitmentManager`

Contrato principal que gestiona el ciclo de vida de cada compromiso.

```
createCommitment(goal, deadline, criteria, evidenceType)
  → lockea MON del usuario como stake

submitEvidence(commitmentId, evidenceHash)
  → el usuario sube hash de evidencia (IPFS o similar)

resolveCommitment(commitmentId, fulfilled)
  → llamado por el backend/IA; distribuye fondos según resultado

supportCommitment(commitmentId)
  → terceros aportan fondos adicionales como incentivo
```

Estados de un compromiso:
```
ACTIVE → EVIDENCE_SUBMITTED → FULFILLED (fondos devueltos)
                             → FAILED    (fondos al pool)
```

### Backend Python

Responsabilidades:
1. **API REST** — recibir requests del frontend
2. **Validación IA** — analizar evidencia y determinar cumplimiento
3. **Interacción on-chain** — llamar `resolveCommitment` via web3.py o eth_abi

Librerías clave:
```bash
pip install web3 python-dotenv fastapi uvicorn openai
```

---

## Flujo Principal

```
1. Usuario crea compromiso en frontend
        ↓
2. Frontend llama CommitmentManager.createCommitment() + lockea stake
        ↓
3. Usuario sube evidencia (foto, doc, link)
        ↓
4. Backend recibe evidencia → LLM analiza vs criterios definidos
        ↓
5. Backend llama CommitmentManager.resolveCommitment(id, fulfilled)
        ↓
6. Contract distribuye fondos automáticamente
```

---

## Comandos útiles

```bash
# Fondos testnet via API
curl -X POST https://agents.devnads.com/v1/faucet \
  -H "Content-Type: application/json" \
  -d '{"chainId": 10143, "address": "0xTU_ADDRESS"}'

# Ver balance
cast balance 0xTU_ADDRESS --rpc-url https://testnet-rpc.monad.xyz

# Llamar función de contrato
cast call $CONTRACT_ADDRESS "getCommitment(uint256)" 1 \
  --rpc-url https://testnet-rpc.monad.xyz

# Enviar tx
cast send $CONTRACT_ADDRESS "resolveCommitment(uint256,bool)" 1 true \
  --private-key $PRIVATE_KEY \
  --rpc-url https://testnet-rpc.monad.xyz
```

---

## Criterios de éxito del hackathon

- [ ] Smart contract deployado y verificado en Monad testnet
- [ ] Backend puede llamar `resolveCommitment` on-chain
- [ ] IA valida al menos un tipo de evidencia (texto/imagen/link)
- [ ] Frontend conecta wallet y crea un compromiso real
- [ ] Al menos un flujo end-to-end funcional demostrable

---

## Notas importantes

- **No hardcodear addresses** en deploy scripts (ver monad.md)
- **EVM version: prague** siempre en foundry.toml
- **Usar `forge script`**, no `forge create`
- Los fondos perdidos van a un pool del ecosistema, no se queman
- El sistema de reputación es capa 2 — priorizar el flujo core primero
