# Wallet Gateway

Splice Wallet Kernel — creates external parties on your participant with full Splice onboarding.

## Scripts

- `npm run start` — Start via `npx @canton-network/wallet-gateway-remote -c ./config.json`

## Endpoints

- **Web UI**: `http://localhost:3030` (login, create wallet, approve transactions)
- **dApp API**: `http://localhost:3030/api/v0/dapp` (CIP-103 JSON-RPC)
- **User API**: `http://localhost:3030/api/v0/user`

## Config

Copy `config.example.json` to `config.json` and fill in your values. `config.json` is gitignored.

- `kernel.id` — Gateway instance ID
- `server.port` — Default 3030
- `server.allowedOrigins` — CORS (include `http://localhost:5173`)
- `bootstrap.idps` — Keycloak OAuth IDP
- `bootstrap.networks` — Canton network (synchronizer ID, Ledger API URL, auth)
- `signingStore` — Required by schema even though docs say optional
- `store` — SQLite for dev, Postgres for production

## Keycloak Requirements

- `canton-test-dashboard` client: add `http://localhost:3030/callback/` (trailing slash) to Valid Redirect URIs
- Web Origins: `*` (required due to trailing-slash mismatch bug)

## Notes

- `ledgerApi` RPC method only supports GET (not POST)
- `prepareExecute` opens approval page, user signs, returns via `txChanged` event
- Parties created here are on YOUR participant (your DARs work)
