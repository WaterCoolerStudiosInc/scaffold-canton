# Backend

Hono + tRPC server for Canton Ledger API writes, PQS reads, and user management.

## Scripts

- `npm run dev` — Start with hot reload (uses `--env-file=.env.local --import tsx`)
- `npm run build` — Compile TypeScript
- `npm test` — Run vitest tests

## Key Dependencies

<!-- AUTO-GENERATED - Updated by /update-claude-md -->
- **hono** (4.12.8) — HTTP server
- **@trpc/server** (11.13.4) — Type-safe API
- **postgres** (3.4.8) — PQS PostgreSQL client
- **jose** (6.2.1) — JWT verification
- **zod** (4.3.6) — Input validation
- **@grpc/grpc-js** + **@grpc/proto-loader** — gRPC client for Canton topology ops (package vetting)

## Structure

- `src/index.ts` — Entry point, CORS, tRPC mount
- `src/router/` — tRPC routers (index, admin, user, registration)
- `src/domain/` — Vault command builders + PQS queries (`vault.ts`, `types.ts`)
- `src/generated/template-ids.ts` — Package-hashed template IDs (from codegen)
- `src/auth/` — Keycloak JWT validation
- `src/ledger/` — Canton Ledger API clients: `index.ts` (JSON v2: submit, ACS, packages), `topology.ts` (gRPC: list/vet/unvet packages)
- `src/pqs/` — PQS PostgreSQL queries
- `src/participant/` — Party/user management
- `src/keycloak/` — Keycloak Admin API (user creation)
- `proto/com/daml/ledger/api/v2/` — Minimal Canton protos for `PackageService.ListVettedPackages` and `admin.PackageManagementService.UpdateVettedPackages` (loaded at runtime via proto-loader)

## Notes

- `domain/types.ts` re-exports `TEMPLATE_IDS` from `generated/template-ids.ts`
- PQS queries in `vault.ts` use unhashed IDs (`Vault:DepositRequest`)
- Ledger API commands use hashed IDs from `template-ids.ts`
- Topology gRPC calls go to `LEDGER_GRPC_URL` (e.g. `grpc.yourdomain.com:443`). Auth reuses the `validator-app` client credentials.
- `ListVettedPackages` server quirk: the `package_metadata_filter` only applies when `topology_state_filter` is also set. Callers should scope by participant or synchronizer.
- Canton refuses to vet two packages with the same `(name, version)` — use `admin.swapVettedPackage` to atomically unvet+vet, or bump the Daml `version` to coexist them.

## Example Code

`domain/vault.ts`, vault routes in `router/user.ts`, vault reads in `router/index.ts`, and vault types in `domain/types.ts` are **examples**. When adding new contracts, follow this order:

1. Run codegen (generates `generated/template-ids.ts` with hashed IDs)
2. Add types to `domain/types.ts`
3. Create domain file with command builders (hashed IDs) + PQS queries (unhashed IDs)
4. Add tRPC routes in `router/`
