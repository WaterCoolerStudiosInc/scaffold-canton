# Scaffold Canton

A full-stack scaffold for building applications on a Canton Network devnet validator. Connects to the [OpenZeppelin canton-token-template](https://github.com/OpenZeppelin/canton-token-template) DAR suite — a CIP-056 compliant token standard implementation.

## What this is

- **Backend** — Hono + tRPC server that talks to a Canton validator node
- **Frontend** — Browser dashboard for exercising every tRPC procedure without writing curl commands

### Backend capabilities

- **Admin procedures** — bootstrap the token factory, mint holdings, manage instruments, create transfer preapprovals, manage parties and users
- **User procedures** — query balances, initiate transfers, accept/reject pending transfers, manage allocations
- **User registration** — allocates a Canton party, creates a ledger user, and creates a Keycloak user in one flow with retry and compensation logic

## Stack

| Layer | Technology |
|---|---|
| HTTP server | [Hono](https://hono.dev) |
| API | [tRPC](https://trpc.io) v11 |
| Auth | Keycloak (OAuth2 JWT via JWKS) |
| Ledger writes | Canton Ledger API v2 (HTTP/JSON) |
| Ledger reads | PQS (PostgreSQL via [postgres.js](https://github.com/porsager/postgres)) |
| Observability | OpenTelemetry (OTLP gRPC) |
| Runtime | Node.js 22, TypeScript 5 (NodeNext) |

## Prerequisites

- Node.js 22+
- A running Canton devnet validator (see [canton-validator-setup](../canton-validator-setup)) with Keycloak and PQS configured
- The [canton-token-template](https://github.com/OpenZeppelin/canton-token-template) DARs uploaded to your validator
- `dpm` CLI (optional — only needed if you want to regenerate JS/TS bindings from the DARs)

---

## Setup

### 1. Clone and install

```bash
git clone <this-repo>
cd scaffold-canton
```

### 2. Configure the backend

```bash
cd backend
cp .env.example .env.local
```

Edit `.env.local`:

```bash
# Your validator's operator party ID — found in your Canton node config
APP_PROVIDER_PARTY=your-org-function-1::abc123...

# Canton Ledger API — exposed via nginx (canton-validator-setup/scripts/proxy.sh)
LEDGER_URL=https://ledger.yourdomain.com

# Splice validator URL — for wallet onboarding
VALIDATOR_URL=https://wallet.yourdomain.com

# Keycloak service account for the backend (validator-app client)
# Found in Keycloak → canton realm → Clients → validator-app → Credentials
LEDGER_TOKEN_URL=https://auth.yourdomain.com/realms/canton/protocol/openid-connect/token
LEDGER_CLIENT_ID=validator-app
LEDGER_CLIENT_SECRET=<from keycloak>

# PQS PostgreSQL connection string (canton-validator-setup/scripts/pqs.sh)
PQS_URL=postgresql://pqs:pqs@localhost:5432/pqs

# Keycloak JWKS — for validating user JWTs
JWKS_URI=https://auth.yourdomain.com/realms/canton/protocol/openid-connect/certs
JWKS_AUDIENCE=https://canton.network.global

# Keycloak Admin API — for user registration
# Requires a backend-admin service account (see Keycloak setup below)
KEYCLOAK_BASE_URL=https://auth.yourdomain.com
KEYCLOAK_REALM=canton
KEYCLOAK_ADMIN_CLIENT_ID=backend-admin
KEYCLOAK_ADMIN_CLIENT_SECRET=<from keycloak>
```

### 3. Configure the frontend

```bash
cd frontend
cp .env.example .env.local
```

Edit `.env.local`:

```bash
# Keycloak OIDC authority for the frontend login flow
VITE_OIDC_AUTHORITY=https://auth.yourdomain.com/realms/canton

# Keycloak client for the frontend (see Keycloak setup below)
VITE_OIDC_CLIENT_ID=canton-test-dashboard

# Must match your local dev URL
VITE_OIDC_REDIRECT_URI=http://localhost:5173

# Splice validator URL — for wallet onboarding
VITE_VALIDATOR_URL=https://wallet.yourdomain.com
```

### 4. Keycloak one-time setup

#### a. Add `sub` mapper to the `daml_ledger_api` scope

The `daml_ledger_api` scope must include the user's Keycloak UUID as `sub`. Without this, the backend cannot map a logged-in user to their Canton party.

Admin UI: **Client scopes** → `daml_ledger_api` → **Mappers** → **Add mapper** → **By configuration** → **User ID**:
- Name: `sub`
- Mapper type: `User ID` (oidc-sub-mapper)
- Add to access token: **ON**

#### b. Create the `canton-test-dashboard` OIDC client

Admin UI: **Clients** → **Create client**:
1. **Client ID**: `canton-test-dashboard`
2. **Client authentication**: OFF (public client)
3. **Authentication flow**: Standard flow ON, Direct access grants OFF
4. **Valid redirect URIs**: `http://localhost:5173/*`
5. **Valid post logout redirect URIs**: `http://localhost:5173`
6. **Web origins**: `http://localhost:5173`
7. **Client scopes** → assign `daml_ledger_api` as a default scope

#### c. Create the `backend-admin` service account

This client is used by the backend to create Keycloak users during registration.

Admin UI: **Clients** → **Create client**:
1. **Client ID**: `backend-admin`
2. **Client authentication**: ON, **Service Accounts Enabled**: ON
3. **Service Account Roles** tab → assign `realm-management → manage-users`
4. Copy the secret from **Credentials** into `KEYCLOAK_ADMIN_CLIENT_SECRET`

> The `backend-admin` client must authenticate against the `canton` realm, not `master`.

### 5. Start the backend

```bash
cd backend
npm install
npm run dev
```

Verify:

```bash
curl http://localhost:8080/trpc/health
# → {"result":{"data":{"status":"ok"}}}
```

### 6. Start the frontend

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:5173
```

Log in with a Keycloak user. The JWT is automatically attached to all tRPC calls.

### 7. Bootstrap the token factory (one-time)

Before any token operations can be performed, the admin must create the `SimpleTokenRules` contract on the ledger. In the frontend, go to the **Admin** tab and use **createRules** with your supported instruments (e.g. `USD`).

Or via curl:

```bash
curl -X POST http://localhost:8080/trpc/admin.createRules \
  -H "Authorization: Bearer <admin-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"json": {"supportedInstruments": ["USD"]}}'
```

---

## Generating Daml types (optional)

The generated JS/TS bindings for the token contracts are gitignored. You only need to regenerate them if you're extending the backend to use the typed Daml client APIs.

```bash
# 1. Build the DAR from source (requires Daml SDK)
cd /path/to/canton-token-template/simple-token
daml build
# → .daml/dist/simple-token-0.1.0.dar

# 2. Run codegen
cd /path/to/scaffold-canton
scripts/daml-codegen.sh \
  -i /path/to/canton-token-template/simple-token/.daml/dist \
  -o backend/src/generated
```

---

## API overview

### Public

| Procedure | Description |
|---|---|
| `health` | Health check |
| `registration.register` | Create a new user (Canton party + ledger user + Keycloak user) |

### Admin (requires admin JWT)

| Procedure | Description |
|---|---|
| `admin.createRules` | Bootstrap the `SimpleTokenRules` factory (one-time) |
| `admin.getRules` | Get the active rules contract |
| `admin.updateInstruments` | Update the supported instruments list |
| `admin.mintHolding` | Mint a `SimpleHolding` for any party |
| `admin.createPreapproval` | Create a `TransferPreapproval` for direct transfers |
| `admin.listParties` | List all parties on the participant node |
| `admin.getParticipantId` | Get the participant node ID |
| `admin.listUsers` | List all Keycloak users |
| `admin.getUser` | Get a user by ID |
| `admin.grantRights` | Grant actAs rights to a user |
| `admin.revokeRights` | Revoke actAs rights from a user |
| `admin.getActiveContracts` | Query active contracts via the Ledger API |
| `admin.listPackages` | List uploaded DAR package IDs |
| `admin.listKnownTemplates` | List all template IDs indexed by PQS |
| `admin.getAllActiveContracts` | Query all known templates via PQS |
| `admin.lookupContract` | Look up any contract by ID (including archived) |
| `admin.getTemplateSummary` | Active contract count per template |

### User (requires user JWT)

| Procedure | Description |
|---|---|
| `user.onboardWallet` | Register with the Splice validator wallet |
| `user.getHoldings` | List active holdings |
| `user.getLockedHoldings` | List locked holdings (in-flight transfers) |
| `user.getHoldingById` | Get a single holding by contract ID |
| `user.getPendingTransfers` | List pending transfer instructions |
| `user.getPreapprovals` | List active transfer preapprovals |
| `user.initiateTransfer` | Start a transfer (self / direct / two-step) |
| `user.acceptTransfer` | Accept a pending transfer instruction |
| `user.rejectTransfer` | Reject a pending transfer instruction |
| `user.withdrawTransfer` | Withdraw a transfer after deadline |
| `user.getAllocations` | List active DvP allocations |
| `user.cancelAllocation` | Cancel an allocation |
| `user.withdrawAllocation` | Withdraw an allocation after deadline |

---

## Transfer paths

`initiateTransfer` dispatches to one of three paths automatically:

1. **Self-transfer** — sender equals receiver, immediate settlement
2. **Direct transfer** — pass a `preapprovalCid`; receiver has pre-authorized via `TransferPreapproval`
3. **Two-step transfer** — no preapproval; creates a pending `SimpleTransferInstruction` the receiver must accept

---

## Project structure

```
scaffold-canton/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Entry point, Hono app, CORS, tRPC mount
│   │   ├── trpc.ts               # tRPC context + procedure tiers (public / party / admin)
│   │   ├── instrumentation.ts    # OpenTelemetry
│   │   ├── auth/                 # Keycloak JWT validation
│   │   ├── ledger/               # Canton Ledger API v2 client (submit, ACS, packages)
│   │   ├── participant/          # Party + user management (Ledger API)
│   │   ├── pqs/                  # PQS postgres client (active(), lookup_contract())
│   │   ├── keycloak/             # Keycloak Admin REST API client
│   │   ├── registration/         # Registration saga (retry + compensation)
│   │   ├── domain/               # Token template types + command builders
│   │   │   ├── types.ts          # Shared types and TEMPLATE_IDS
│   │   │   ├── rules.ts          # SimpleTokenRules commands
│   │   │   ├── holdings.ts       # SimpleHolding / LockedSimpleHolding
│   │   │   ├── transfers.ts      # TransferInstruction + TransferPreapproval
│   │   │   └── allocations.ts    # SimpleAllocation
│   │   ├── router/               # tRPC routers
│   │   │   ├── admin.ts
│   │   │   ├── user.ts
│   │   │   └── registration.ts
│   │   └── tests/                # Vitest unit tests
│   └── .env.example
├── frontend/
│   └── src/
│       ├── App.tsx               # Tab layout + auth
│       ├── tabs/
│       │   ├── AdminTab.tsx      # Admin procedures
│       │   ├── UserTab.tsx       # User write operations
│       │   └── PqsTab.tsx        # PQS read queries
│       └── components/           # Panel, Field, ResultBox, TabBar
└── scripts/
    └── daml-codegen.sh           # Batch codegen for all DARs in a directory
```

---

## DAR reference

All templates from `simple-token-0.1.0`:

| Template | Signatories | Purpose |
|---|---|---|
| `SimpleHolding` | admin, owner | Unlocked token holding |
| `LockedSimpleHolding` | admin, owner, lock.holders | In-flight locked holding |
| `SimpleTokenRules` | admin | Factory for transfers + allocations |
| `SimpleTransferInstruction` | admin, sender | Pending two-step transfer |
| `SimpleAllocation` | admin, sender | DvP settlement contract |
| `TransferPreapproval` | admin, receiver | Pre-auth for direct transfers |

Template IDs for PQS queries use the format `SimpleToken.<Module>:<Template>` (e.g. `SimpleToken.Holding:SimpleHolding`).
