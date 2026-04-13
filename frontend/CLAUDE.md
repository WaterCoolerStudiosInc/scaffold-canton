# Frontend

React 19 + Vite dashboard with dual auth: wallet gateway (dApp SDK) and Keycloak (OIDC).

## Scripts

- `npm run dev` — Vite dev server (:5173)
- `npm run build` — Production build
- `npm run lint` — ESLint

## Key Dependencies

<!-- AUTO-GENERATED - Updated by /update-claude-md -->
- **react** (19.2.4) — UI framework
- **@canton-network/dapp-sdk** (0.25.0) — Wallet gateway connection (RemoteAdapter)
- **react-oidc-context** (3.3.1) — Keycloak OIDC auth
- **@trpc/client** (11.15.1) — Backend API client

## Tabs

- **Auth** — Wallet gateway connect + Admin Keycloak login
- **Vault** — Deposit/withdraw (user via dApp SDK, admin via tRPC)
- **Admin** — Parties, users, packages, contracts (Keycloak required)
- **PQS** — Raw PQS queries
- **Registration** — Create new users
- **Health** — Health check

## Key Files

- `src/App.tsx` — Tab layout, dual auth state management
- `src/wallet/gatewaySdk.ts` — DappSDK singleton (shared across tabs)
- `src/tabs/VaultTab.tsx` — Vault operations (imports `TEMPLATE_IDS` from backend generated code)
- `src/tabs/AuthTab.tsx` — Wallet gateway (RemoteAdapter) + Keycloak panels
- `src/trpc.ts` — tRPC client with `setToken`, `setPartyHint`, `getToken`

## Notes

- Vite alias `backend` → `../backend/src` for importing `TEMPLATE_IDS`
- Wallet gateway `ledgerApi` only supports GET (uppercase `'GET'` required)
- `prepareExecute` submits Daml commands through wallet gateway approval UI

## Example Code

`VaultTab.tsx` is an **example** — last step in the order of operations. After contracts are written, DARs built, codegen run, and backend logic created:

5. Import `TEMPLATE_IDS` from `backend/generated/template-ids.ts`
6. Wallet writes: `gatewaySdk.prepareExecute({ commands: [{ CreateCommand: { templateId: TEMPLATE_IDS.X, ... } }] })`
7. Admin writes: `trpc.user.someRoute.mutate(...)`
8. Reads: `trpc.vault.someQuery.query({ partyId })`
