# SoTives

Plataforma de compromisos verificables con incentivos. El usuario crea una meta, define una stake y valida su cumplimiento; el backend orquesta la verificacion y la ejecucion on-chain sobre Monad.

## Estructura

- `frontend/`: Next.js (App Router) + wagmi/viem.
- `backend/`: FastAPI para orquestacion, verificacion y endpoints publicos.
- `contracts/`: contratos Solidity con Foundry.

## Requisitos

- Node.js 20+ (recomendado) y npm.
- Python 3.10+.
- Foundry (solo si vas a trabajar con contratos).

## Instalacion y desarrollo

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Abrir http://localhost:3000

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API disponible en http://localhost:8000

### Contratos (opcional)

Instalar Foundry en Windows (Git Bash):

```bash
curl -L https://foundry.paradigm.xyz | bash
~/.foundry/bin/foundryup
```

Si queres usar `forge` desde PowerShell, agrega `C:\Users\TU_USUARIO\.foundry\bin` al PATH.

macOS/Linux:

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

Luego:

```bash
cd contracts
forge build
forge test
```

## Variables de entorno (backend)

Crear `backend/.env` con los valores necesarios:

```ini
RPC_URL=https://testnet-rpc.monad.xyz
CHAIN_ID=10143
VALIDATOR_PRIVATE_KEY=
COMMITMENT_MANAGER_ADDRESS=0x0000000000000000000000000000000000000000
COMMITMENT_POOL_ADDRESS=0x0000000000000000000000000000000000000000
MULTISIG_FACTORY_ADDRESS=0x0000000000000000000000000000000000000000
OPENAI_API_KEY=
GITHUB_TOKEN=
```

Notas:
- `VALIDATOR_PRIVATE_KEY` firma resoluciones de compromiso.
- `OPENAI_API_KEY` habilita la verificacion por IA.
- `GITHUB_TOKEN` es opcional (rate limit mas alto).

## Scripts utiles

Frontend:
- `npm run dev` - servidor de desarrollo.
- `npm run build` - build de produccion.
- `npm run start` - servidor de produccion.
- `npm run lint` - lint.

Backend:
- `uvicorn main:app --reload` - desarrollo.

## Licencia

Pendiente de definir.
