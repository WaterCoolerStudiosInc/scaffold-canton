# Scaffold Canton

A full-stack scaffold for building dApps on Canton Network. Includes a **Vault** Daml contract, a tRPC backend, and a React frontend with wallet gateway integration for external party signing.

## Quick start

```bash
# 1. Build the Daml contract
cd daml && daml build && cd ..

# 2. Generate TypeScript bindings
scripts/daml-codegen.sh -i daml/.daml/dist -o backend/src/generated

# 3. Configure
cp backend/.env.example backend/.env.local   # edit with your validator details
cp frontend/.env.example frontend/.env.local # edit with your URLs

# 4. Install dependencies
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 5. Upload the DAR to your participant (one-time)
TOKEN=$(curl -fsSL -X POST \
  https://auth.yourdomain.com/realms/canton/protocol/openid-connect/token \
  -d "client_id=validator-app" \
  -d "client_secret=${VALIDATOR_CLIENT_SECRET}" \
  -d "grant_type=client_credentials" | jq -r '.access_token')

curl -fsS -X POST "https://ledger.yourdomain.com/v2/packages" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @daml/.daml/dist/scaffold-vault-0.1.0.dar

# 6. Start all three services
cd backend && npm run dev &          # backend on :8080
cd frontend && npm run dev &         # frontend on :5173
cd wallet-gateway && npm run start & # wallet gateway on :3030
```

Open `http://localhost:5173`.

### Backend `.env.local`

```bash
APP_PROVIDER_PARTY=cenote-validator-1::1220...   # your admin party
LEDGER_URL=https://ledger.yourdomain.com
LEDGER_GRPC_URL=grpc.yourdomain.com:443          # gRPC endpoint for admin topology ops (package vetting)
LEDGER_GRPC_TLS=true                             # false for plaintext local dev
VALIDATOR_URL=https://wallet.yourdomain.com
SYNCHRONIZER_ID=global-domain::1220...
LEDGER_TOKEN_URL=https://auth.yourdomain.com/realms/canton/protocol/openid-connect/token
LEDGER_CLIENT_ID=validator-app
LEDGER_CLIENT_SECRET=<from keycloak>
PQS_URL=postgresql://pqs:<password>@localhost:5434/pqs
JWKS_URI=https://auth.yourdomain.com/realms/canton/protocol/openid-connect/certs
JWKS_AUDIENCE=https://canton.network.global
KEYCLOAK_BASE_URL=https://auth.yourdomain.com
KEYCLOAK_REALM=canton
KEYCLOAK_ADMIN_CLIENT_ID=backend-admin
KEYCLOAK_ADMIN_CLIENT_SECRET=<from keycloak>
```

### Frontend `.env.local`

```bash
VITE_OIDC_AUTHORITY=https://auth.yourdomain.com/realms/canton
VITE_OIDC_CLIENT_ID=canton-test-dashboard
VITE_OIDC_REDIRECT_URI=http://localhost:5173
VITE_VALIDATOR_URL=https://wallet.yourdomain.com
VITE_LEDGER_URL=https://ledger.yourdomain.com
VITE_WALLET_GATEWAY_URL=http://localhost:3030
```

### Wallet gateway `config.json`

```bash
cp wallet-gateway/config.example.json wallet-gateway/config.json
# Edit config.json with your validator details
```

Key fields: Keycloak IDP, network synchronizer ID, Ledger API URL, admin auth credentials. `config.json` is gitignored.

---

## End-to-end: deposit and withdraw

### 1. Connect wallet

Go to **Auth** tab → **Connect wallet**. The wallet gateway opens for login. Create a wallet (choose Participant signing provider). Your party appears as connected.

### 2. Create a deposit

Go to **Vault** tab → enter amount and memo → **Submit deposit request**. Approve in the wallet gateway UI. The `DepositRequest` contract is created.

### 3. Admin accepts

In **Auth** tab → **Admin login** (Keycloak as the admin account). Go to **Vault** tab → **Pending requests** to see the deposit. Copy the contract ID → **Accept deposit request**.

### 4. User withdraws

Back as the wallet user in **Vault** tab → **Confirmed deposits** to see the `Deposit` contract. Copy contract ID → **Withdraw deposit**. Approve in the wallet gateway UI.

---

## Architecture

```
Frontend (:5173)
  ├── Auth tab          → Wallet gateway (connect) + Keycloak (admin login)
  ├── Vault tab         → Reads: tRPC → backend → PQS
  │                       Writes (user): dApp SDK → wallet gateway → Ledger API
  │                       Writes (admin): tRPC → backend → Ledger API
  ├── Admin tab         → tRPC → backend (Keycloak JWT required)
  ├── PQS tab           → tRPC → backend → PQS
  └── Registration tab  → tRPC → backend → Keycloak + Ledger API

Wallet Gateway (:3030)
  └── @canton-network/wallet-gateway-remote
      Creates external parties on YOUR participant
      Handles signing via prepareExecute → approval UI

Backend (:8080)
  └── Hono + tRPC
      Ledger API writes (admin token)
      PQS reads (PostgreSQL)
      Keycloak user management
```

### Two auth paths

| Path | Who | Writes | Reads |
|---|---|---|---|
| **Wallet Gateway** | External parties (users) | dApp SDK `prepareExecute` | Public tRPC → PQS |
| **Keycloak** | Hosted parties (admin) | tRPC → Ledger API | tRPC → PQS |

---

## Vault contract

```
daml/daml/Vault.daml
```

| Template | Signatories | Observers | Purpose |
|---|---|---|---|
| `DepositRequest` | user | admin | User proposes deposit; admin must accept |
| `Deposit` | user, admin | — | Confirmed deposit; user can withdraw |

| Choice | Controller | Effect |
|---|---|---|
| `DepositRequest_Accept` | admin | Creates `Deposit` |
| `DepositRequest_Cancel` | user | Archives request |
| `Deposit_Withdraw` | user | Archives deposit |
| `Deposit_Release` | admin | Archives deposit |

---

## Template IDs and package hashes

**Canton 3.4.12+ requires full package hashes** for Ledger API commands. PQS uses a different format.

| Context | Format | Example |
|---|---|---|
| Ledger API / dApp SDK | `hash:Module:Template` | `7c39422f...:Vault:DepositRequest` |
| PQS `active()` | `Module:Template` | `Vault:DepositRequest` |

The codegen script generates `backend/src/generated/template-ids.ts` with hashed IDs. Both backend and frontend import from this file. PQS queries use unhashed IDs defined in `domain/vault.ts`.

---

## API

### Public (no JWT)

| Procedure | Description |
|---|---|
| `health` | Health check |
| `registration.register` | Create user (party + ledger user + Keycloak user) |
| `vault.depositRequests` | List deposit requests by party |
| `vault.deposits` | List confirmed deposits by party |

### User (JWT required)

| Procedure | Description |
|---|---|
| `user.getDepositRequests` | Pending deposit requests |
| `user.getDeposits` | Confirmed deposits |
| `user.createDepositRequest` | Propose a deposit |
| `user.acceptDeposit` | Admin accepts request |
| `user.withdrawDeposit` | User withdraws deposit |
| `user.releaseDeposit` | Admin releases deposit |
| `user.getCcBalance` | CC balance (validator API) |
| `user.sendCc` | Send CC transfer offer |

### Admin (admin JWT)

| Procedure | Description |
|---|---|
| `admin.listParties` | List parties |
| `admin.listPackages` | List DAR packages (registered on participant) |
| `admin.listVettedPackages` | List vetted packages (scope by participant/synchronizer) |
| `admin.vetPackage` | Vet a package on the synchronizer (topology write) |
| `admin.unvetPackage` | Unvet a package (topology write) |
| `admin.swapVettedPackage` | Atomic unvet + vet in one topology transaction |
| `admin.listKnownTemplates` | PQS template registry |
| `admin.getTemplateSummary` | Contract counts per template |
| `admin.getActiveContracts` | Query ACS via Ledger API |
| `admin.lookupContract` | Lookup any contract by ID |

---

## Project structure

```
scaffold-canton/
├── daml/
│   ├── daml.yaml                  # SDK 3.4.10
│   └── daml/Vault.daml            # DepositRequest + Deposit
├── backend/
│   ├── proto/                     # Canton Ledger API gRPC protos (package vetting)
│   └── src/
│       ├── index.ts               # Hono server, tRPC mount
│       ├── domain/
│       │   ├── types.ts           # Re-exports TEMPLATE_IDS + Vault types
│       │   └── vault.ts           # Vault command builders + PQS queries
│       ├── generated/
│       │   └── template-ids.ts    # Generated hashed IDs (from codegen)
│       ├── router/
│       │   ├── index.ts           # Public routes (vault reads)
│       │   ├── admin.ts           # Admin procedures
│       │   ├── user.ts            # User + vault + CC procedures
│       │   └── registration.ts    # User registration
│       ├── auth/                  # JWT validation
│       ├── ledger/                # Ledger API v2 client (JSON) + topology.ts (gRPC for vetting)
│       ├── participant/           # Party/user management
│       ├── pqs/                   # PQS PostgreSQL client
│       └── keycloak/              # Keycloak Admin API
├── frontend/
│   └── src/
│       ├── App.tsx
│       ├── wallet/gatewaySdk.ts   # DappSDK singleton
│       └── tabs/
│           ├── AuthTab.tsx        # Wallet + Admin login
│           ├── VaultTab.tsx       # Deposit/withdraw
│           ├── AdminTab.tsx       # Admin operations
│           ├── PqsTab.tsx         # PQS queries
│           └── RegistrationTab.tsx
├── wallet-gateway/
│   ├── config.json                # (gitignored)
│   └── package.json
└── scripts/
    └── daml-codegen.sh
```

---

## Keycloak setup

### `canton-test-dashboard` client

- Client authentication: OFF (public)
- Valid redirect URIs: `http://localhost:5173/*`, `http://localhost:3030/callback/`
- Web origins: `*`
- Client scopes: assign `daml_ledger_api` as default

### `backend-admin` service account

- Client authentication: ON, Service Accounts: ON
- Service Account Roles: `realm-management → manage-users`

### `daml_ledger_api` scope

Add a **User ID** mapper (`sub` claim) with "Add to access token" ON.

---

## Rebuilding after Daml changes

```bash
cd daml && daml build
cd .. && scripts/daml-codegen.sh -i daml/.daml/dist -o backend/src/generated

# Upload new DAR
curl -fsS -X POST "https://ledger.yourdomain.com/v2/packages" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @daml/.daml/dist/scaffold-vault-0.1.0.dar

# Re-index PQS (on server)
docker compose -f pqs/compose.yaml down
docker volume rm pqs_postgres-pqs-data
docker compose -f pqs/compose.yaml up -d

# Restart backend + frontend
```

> PQS won't discover new packages automatically. Re-index after uploading new DARs.

---

## Package vetting

Uploading a DAR registers it locally on the participant; **vetting** is a separate topology transaction that advertises "this participant accepts this package" to the synchronizer. `POST /v2/packages` usually auto-vets, but the vetted state and individual vet/unvet operations aren't on the JSON Ledger API — they're on the gRPC `PackageManagementService`.

### Canton SCU constraint

Canton refuses to vet two packages that share the same `(name, version)` pair — even if the source (and hash) differ. Error: `KNOWN_PACKAGE_VERSION`. If you build a new version of the same DAR, bump `version` in `daml.yaml` so SCU can coexist the old and new.

### Admin UI

The **Admin** tab exposes these operations:

- **listVettedPackages** — filter by package IDs / name prefixes / participants / synchronizers.
  > The metadata filter is a no-op unless `participantIds` or `synchronizerIds` is also set (Canton 3.4.12 server quirk).
- **vetPackage / unvetPackage** — single-package topology changes, with dry-run by default.
- **swapVettedPackage** — atomic unvet + vet, for resolving the name+version conflict above.

### Under the hood

- `backend/proto/` — minimal Canton gRPC `.proto` files (`ListVettedPackages`, `UpdateVettedPackages`)
- `backend/src/ledger/topology.ts` — `@grpc/grpc-js` client, injects Bearer auth per call
- `LEDGER_GRPC_URL` env — typically an nginx-proxied hostname to the participant's Ledger API gRPC port
- Uses the same `validator-app` client credentials as the JSON Ledger API
