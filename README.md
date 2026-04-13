# Scaffold Canton

A full-stack scaffold for building applications on a Canton Network devnet validator. Includes a **Vault** Daml contract (deposit/withdraw) with two auth paths: Keycloak (hosted parties) and wallet gateway (external parties via dApp SDK).

## What this is

- **Daml contract** — `Vault.daml` with `DepositRequest` and `Deposit` templates
- **Backend** — Hono + tRPC server for Ledger API writes, PQS reads, and user registration
- **Frontend** — Dashboard with OIDC login (hosted parties) + wallet gateway (external parties)
- **Wallet Gateway** — Splice Wallet Kernel for external party creation and signing

## Stack

| Layer | Technology |
|---|---|
| Smart contracts | [Daml](https://docs.digitalasset.com) 3.4 on Canton 3.x |
| HTTP server | [Hono](https://hono.dev) |
| API | [tRPC](https://trpc.io) v11 |
| Auth | Keycloak (OAuth2 JWT) + Wallet Gateway ([dApp SDK](https://github.com/hyperledger-labs/splice-wallet-kernel)) |
| Ledger writes | Canton Ledger API v2 (HTTP/JSON) |
| Ledger reads | PQS (PostgreSQL via [postgres.js](https://github.com/porsager/postgres)) |
| Observability | OpenTelemetry (OTLP gRPC) |
| Runtime | Node.js 22, TypeScript 5 |

## Prerequisites

- Node.js 22+
- A running Canton devnet validator with Keycloak and PQS configured
- `dpm` CLI (for Daml builds and codegen)

---

## Setup

### 1. Clone and install

```bash
git clone <this-repo>
cd scaffold-canton
```

### 2. Build the Daml contract

```bash
cd daml
daml build
# → .daml/dist/scaffold-vault-0.1.0.dar
```

### 3. Generate TypeScript bindings

```bash
cd ..
scripts/daml-codegen.sh \
  -i daml/.daml/dist \
  -o backend/src/generated
```

This generates `backend/src/generated/template-ids.ts` with the package hashes. The frontend imports these directly.

### 4. Configure the backend

```bash
cd backend
cp .env.example .env.local
```

Edit `.env.local` — see `.env.example` for all options. Key fields:

```bash
APP_PROVIDER_PARTY=cenote-validator-1::1220...  # your admin party
LEDGER_URL=https://ledger.yourdomain.com
VALIDATOR_URL=https://wallet.yourdomain.com
SYNCHRONIZER_ID=global-domain::1220...           # from GET /v2/state/connected-synchronizers
```

### 5. Configure the frontend

```bash
cd frontend
cp .env.example .env.local
```

```bash
VITE_OIDC_AUTHORITY=https://auth.yourdomain.com/realms/canton
VITE_OIDC_CLIENT_ID=canton-test-dashboard
VITE_OIDC_REDIRECT_URI=http://localhost:5173
VITE_VALIDATOR_URL=https://wallet.yourdomain.com
VITE_LEDGER_URL=https://ledger.yourdomain.com
VITE_WALLET_GATEWAY_URL=http://localhost:3030
```

### 6. Keycloak one-time setup

#### a. Add `sub` mapper to the `daml_ledger_api` scope

Admin UI: **Client scopes** → `daml_ledger_api` → **Mappers** → **Add mapper** → **User ID**:
- Add to access token: **ON**

#### b. Create the `canton-test-dashboard` OIDC client

1. **Client authentication**: OFF (public client)
2. **Valid redirect URIs**: `http://localhost:5173/*`, `http://localhost:3030/callback/`
3. **Web origins**: `*`
4. **Client scopes** → assign `daml_ledger_api` as default

> The wallet gateway sends `redirect_uri` with a trailing slash. Add `http://localhost:3030/callback/` (with slash) to Valid Redirect URIs.

#### c. Create the `backend-admin` service account

1. **Client authentication**: ON, **Service Accounts Enabled**: ON
2. **Service Account Roles** → assign `realm-management → manage-users`

### 7. Upload the DAR

```bash
TOKEN=$(curl -fsSL -X POST \
  https://auth.yourdomain.com/realms/canton/protocol/openid-connect/token \
  -d "client_id=validator-app" \
  -d "client_secret=${VALIDATOR_CLIENT_SECRET}" \
  -d "grant_type=client_credentials" \
  | jq -r '.access_token')

curl -fsS -X POST "https://ledger.yourdomain.com/v2/packages" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @daml/.daml/dist/scaffold-vault-0.1.0.dar
```

### 8. Start everything

```bash
# Terminal 1: backend
cd backend && npm install && npm run dev

# Terminal 2: frontend
cd frontend && npm install && npm run dev

# Terminal 3: wallet gateway
cd wallet-gateway && npm run start
```

---

## End-to-end walkthrough: deposit and withdraw

This walks through the full Vault contract lifecycle with an external party (wallet gateway) and the admin (Keycloak).

### Step 1: Connect wallet (external party)

1. Open `http://localhost:5173`
2. Go to **Auth** tab → click **Connect gateway**
3. The wallet gateway UI opens at `http://localhost:3030`
4. Log in with Keycloak, create a wallet (choose **Participant** signing provider)
5. Back in the scaffold, your party ID appears as connected

### Step 2: Create a deposit request

1. Go to **Wallet Tx** tab
2. Enter an amount (e.g. `100`) and optional memo
3. Click **Submit deposit request**
4. The wallet gateway opens its approval page — approve the transaction
5. The `DepositRequest` contract is created on the ledger

> The admin must now accept this request.

### Step 3: Admin accepts the deposit

1. Go to **Auth** tab → **Login with Keycloak** (as the admin/operator account)
2. Go to **User** tab
3. Click **Pending requests** to see the deposit request and its contract ID
4. Copy the contract ID
5. Paste into **Accept deposit request** → click **Accept**
6. The `Deposit` contract is now active (both user and admin are signatories)

### Step 4: Verify the deposit

- **Wallet Tx** tab → click **Confirmed deposits** to see the active `Deposit` contract
- **User** tab → click **Confirmed deposits** to see it from the admin side

### Step 5: User withdraws

1. Go to **Wallet Tx** tab
2. Copy the `Deposit` contract ID from the confirmed deposits list
3. Paste into **Withdraw deposit** → click **Withdraw**
4. Approve in the wallet gateway UI
5. The `Deposit` contract is archived

---

## Vault contract

| Template | Signatories | Observers | Purpose |
|---|---|---|---|
| `DepositRequest` | user | admin | User proposes a deposit; admin must accept |
| `Deposit` | user, admin | — | Confirmed deposit; user can withdraw, admin can release |

**Choices:**

| Template | Choice | Controller | Effect |
|---|---|---|---|
| `DepositRequest` | `DepositRequest_Accept` | admin | Creates a `Deposit` |
| `DepositRequest` | `DepositRequest_Cancel` | user | Archives the request |
| `Deposit` | `Deposit_Withdraw` | user | Archives (user reclaims) |
| `Deposit` | `Deposit_Release` | admin | Archives (admin returns) |

---

## Two auth paths

| Path | Who | Writes | Reads |
|---|---|---|---|
| **Keycloak (OIDC)** | Hosted parties (admin, operators) | tRPC → backend → Ledger API | tRPC → backend → PQS |
| **Wallet Gateway (dApp SDK)** | External parties (users) | dApp SDK `prepareExecute` → gateway signs | tRPC → backend → PQS (public, no JWT) |

The wallet gateway creates external parties on **your participant** where your DARs are vetted. This is required for custom contracts — third-party wallet extensions (e.g. Console Wallet) create parties on their own infrastructure where your DARs aren't available.

---

## API overview

### Public (no JWT)

| Procedure | Description |
|---|---|
| `health` | Health check |
| `registration.register` | Create user (Canton party + ledger user + Keycloak user) |
| `vault.depositRequests` | List deposit requests by party ID |
| `vault.deposits` | List confirmed deposits by party ID |
| `prepareCommand` | Prepare a Daml command for external party signing |
| `submitSigned` | Submit an externally signed transaction |

### User (requires user JWT)

| Procedure | Description |
|---|---|
| **Vault** | |
| `user.getDepositRequests` | List pending deposit requests |
| `user.getDeposits` | List confirmed deposits |
| `user.createDepositRequest` | Propose a deposit |
| `user.acceptDeposit` | Admin accepts a deposit request |
| `user.cancelDepositRequest` | User cancels their request |
| `user.withdrawDeposit` | User withdraws a confirmed deposit |
| `user.releaseDeposit` | Admin releases a deposit |
| **CC (Canton Coin)** | |
| `user.getCcBalance` | CC balance via validator wallet API |
| `user.sendCc` | Send CC transfer offer |
| `user.listCcTransferOffers` | List pending CC offers |
| `user.acceptCcTransferOffer` | Accept a CC offer |

### Admin (requires admin JWT)

| Procedure | Description |
|---|---|
| `admin.listParties` | List parties on the participant |
| `admin.listPackages` | List uploaded DAR package IDs |
| `admin.listKnownTemplates` | List all template IDs indexed by PQS |
| `admin.getAllActiveContracts` | Query all known templates via PQS |
| `admin.lookupContract` | Look up any contract by ID |
| `admin.getTemplateSummary` | Active contract count per template |

---

## Project structure

```
scaffold-canton/
├── daml/                          # Daml smart contract
│   ├── daml.yaml                  # SDK 3.4.10, scaffold-vault 0.1.0
│   └── daml/
│       └── Vault.daml             # DepositRequest + Deposit templates
├── backend/
│   ├── src/
│   │   ├── index.ts               # Hono app, CORS, tRPC mount
│   │   ├── domain/
│   │   │   ├── types.ts           # TEMPLATE_IDS + shared types
│   │   │   └── vault.ts           # Vault command builders + PQS queries
│   │   ├── generated/
│   │   │   └── template-ids.ts    # Generated package hashes (from codegen)
│   │   ├── router/
│   │   │   ├── index.ts           # Public routes (vault reads, prepare/submit-signed)
│   │   │   ├── admin.ts           # Admin procedures
│   │   │   ├── user.ts            # User + vault + CC procedures
│   │   │   └── registration.ts    # User registration saga
│   │   ├── auth/                  # JWT validation
│   │   ├── ledger/                # Canton Ledger API v2 client
│   │   ├── participant/           # Party/user management
│   │   ├── pqs/                   # PQS PostgreSQL client
│   │   └── keycloak/              # Keycloak Admin API
│   └── .env.example
├── frontend/
│   └── src/
│       ├── App.tsx                # Tab layout, dual auth (OIDC + wallet)
│       ├── wallet/
│       │   └── gatewaySdk.ts      # DappSDK singleton
│       ├── tabs/
│       │   ├── AuthTab.tsx        # Wallet Gateway + Admin (Keycloak) login
│       │   ├── VaultTab.tsx       # Vault: deposit/withdraw (wallet + admin)
│       │   ├── AdminTab.tsx       # Admin operations
│       │   ├── PqsTab.tsx         # PQS read queries
│       │   ├── RegistrationTab.tsx # User registration
│       │   └── HealthTab.tsx      # Health check
│       └── components/
├── wallet-gateway/
│   ├── config.json                # Wallet gateway config (gitignored)
│   └── package.json
└── scripts/
    └── daml-codegen.sh            # Batch JS/TS codegen from DARs
```

---

## Template IDs and package hashes

**Canton 3.4.12+ requires full package hashes in template IDs** for Ledger API command submission. `Vault:DepositRequest` (without hash) silently fails with "Invalid value for: body". You must use the full form: `7c39422f...:Vault:DepositRequest`.

The codegen script generates `backend/src/generated/template-ids.ts` with the correct hashed IDs. Both the backend (`domain/types.ts`) and frontend (`VaultTab.tsx`) import from this file.

**PQS uses a different format**: the `active()` function uses `Module:Template` (no hash). These are defined inline in `domain/vault.ts`.

| Context | Format | Example |
|---------|--------|---------|
| Ledger API (submit) | `hash:Module:Template` | `7c39422f...:Vault:DepositRequest` |
| PQS `active()` | `Module:Template` | `Vault:DepositRequest` |
| dApp SDK `prepareExecute` | `hash:Module:Template` | `7c39422f...:Vault:DepositRequest` |

---

## Rebuilding after Daml changes

```bash
# 1. Edit daml/daml/Vault.daml

# 2. Rebuild the DAR
cd daml && daml build

# 3. Regenerate TypeScript bindings (updates package hashes)
cd .. && scripts/daml-codegen.sh -i daml/.daml/dist -o backend/src/generated

# 4. Upload new DAR to participant
curl -fsS -X POST "https://ledger.yourdomain.com/v2/packages" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @daml/.daml/dist/scaffold-vault-0.1.0.dar

# 5. Restart backend + frontend (picks up new template IDs from generated/template-ids.ts)

# 6. Re-index PQS (on the server) so it discovers the new templates
ssh your-server
docker compose -f pqs/compose.yaml down
docker volume rm pqs_postgres-pqs-data
docker compose -f pqs/compose.yaml up -d
# Wait ~2 minutes for PQS to replay the ledger and become healthy
```

> **PQS won't discover new DAR packages automatically.** After uploading a new DAR, you must re-index PQS (step 6) or at minimum restart it. PQS caches its template registry and only discovers new packages when replaying the ledger stream.
