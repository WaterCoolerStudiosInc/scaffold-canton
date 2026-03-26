# Canton Devnet Playground

A backend scaffold for building applications on a Canton Network devnet validator. Connects to the [OpenZeppelin canton-token-template](https://github.com/OpenZeppelin/canton-token-template) DAR suite — a CIP-056 compliant token standard implementation.

## What this is

This is a Hono + tRPC backend that talks to a Canton validator node deployed via [canton-validator-setup](../canton-validator-setup). It provides:

- **Admin procedures** — bootstrap the token factory, mint holdings, manage instruments, create transfer preapprovals
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

A running Canton devnet validator set up with:
- [canton-validator-setup](../canton-validator-setup) — core validator node
- `scripts/auth.sh` — Keycloak authentication
- `scripts/pqs.sh` — Participant Query Store (PostgreSQL)
- `scripts/proxy.sh` — nginx with SSL (for public endpoints)

The [canton-token-template](https://github.com/OpenZeppelin/canton-token-template) DARs uploaded to your validator.

## Getting started

```bash
cd backend
cp .env.example .env
# fill in your devnet values (see Configuration below)
npm install
npm run dev
```

Verify the server is running:

```bash
curl http://localhost:8080/trpc/health
# → {"result":{"data":{"status":"ok"}}}
```

## Configuration

Copy `.env.example` to `.env` and fill in:

```bash
# Your validator's operator party ID
APP_PROVIDER_PARTY=your-org-function-1::abc123...

# Canton Ledger API
LEDGER_URL=https://ledger.yourdomain.com
LEDGER_TOKEN_URL=https://auth.yourdomain.com/realms/canton/protocol/openid-connect/token
LEDGER_CLIENT_ID=validator-app
LEDGER_CLIENT_SECRET=<from keycloak>

# PQS
PQS_URL=postgresql://pqs:pqs@localhost:5432/pqs

# Keycloak JWKS (for validating user JWTs)
JWKS_URI=https://auth.yourdomain.com/realms/canton/protocol/openid-connect/certs
JWKS_AUDIENCE=https://canton.network.global

# Keycloak Admin API (for user registration)
KEYCLOAK_BASE_URL=https://auth.yourdomain.com
KEYCLOAK_REALM=canton
KEYCLOAK_ADMIN_CLIENT_ID=backend-admin
KEYCLOAK_ADMIN_CLIENT_SECRET=<from keycloak>
```

### Keycloak admin client setup

Create a service account in Keycloak for the backend's registration flow:

1. Go to `https://auth.yourdomain.com` → **canton** realm → **Clients** → **Create**
2. Client ID: `backend-admin`, Protocol: `openid-connect`
3. Enable **Client Authentication** + **Service Accounts Enabled**
4. **Service Account Roles** tab → assign `realm-management → manage-users`
5. Copy the secret from **Credentials** into `KEYCLOAK_ADMIN_CLIENT_SECRET`

## Bootstrap

After starting the server, create the `SimpleTokenRules` factory contract once:

```bash
curl -X POST http://localhost:8080/trpc/admin.createRules \
  -H "Authorization: Bearer <admin-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"json": {"supportedInstruments": ["USD"]}}'
```

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

### User (requires user JWT)

| Procedure | Description |
|---|---|
| `user.getHoldings` | List active holdings |
| `user.getLockedHoldings` | List locked holdings (in-flight transfers) |
| `user.getPendingTransfers` | List pending transfer instructions |
| `user.initiateTransfer` | Start a transfer (self / direct / two-step) |
| `user.acceptTransfer` | Accept a pending transfer instruction |
| `user.rejectTransfer` | Reject a pending transfer instruction |
| `user.withdrawTransfer` | Withdraw a transfer after deadline |
| `user.getAllocations` | List active DvP allocations |
| `user.cancelAllocation` | Cancel an allocation |
| `user.withdrawAllocation` | Withdraw an allocation after deadline |

## Transfer paths

The `initiateTransfer` procedure dispatches to one of three paths automatically via `SimpleTokenRules.TransferFactory_Transfer`:

1. **Self-transfer** — sender equals receiver, immediate settlement
2. **Direct transfer** — pass a `preapprovalCid`; receiver has pre-authorized via `TransferPreapproval`
3. **Two-step transfer** — no preapproval; creates a pending `SimpleTransferInstruction` the receiver must accept

## Project structure

```
backend/
├── src/
│   ├── index.ts              # Entry point
│   ├── trpc.ts               # tRPC context + procedure tiers
│   ├── instrumentation.ts    # OpenTelemetry
│   ├── auth/                 # Keycloak JWT validation
│   ├── ledger/               # Canton Ledger API v2 client
│   ├── participant/          # Party + user management (Ledger API)
│   ├── pqs/                  # PQS postgres client
│   ├── keycloak/             # Keycloak Admin REST API client
│   ├── registration/         # Registration saga (retry + compensation)
│   ├── domain/               # Token template types + command builders
│   │   ├── types.ts          # TypeScript types for all 7 templates
│   │   ├── rules.ts          # SimpleTokenRules
│   │   ├── holdings.ts       # SimpleHolding / LockedSimpleHolding
│   │   ├── transfers.ts      # TransferInstruction + TransferPreapproval
│   │   └── allocations.ts    # SimpleAllocation
│   └── router/               # tRPC routers
│       ├── index.ts
│       ├── admin.ts
│       ├── user.ts
│       └── registration.ts
└── .env.example
```

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

Template IDs use the format `simple-token-0.1.0:SimpleToken.<Module>:<Template>`.
