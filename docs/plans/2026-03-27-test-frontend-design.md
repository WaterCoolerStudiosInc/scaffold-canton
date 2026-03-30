# Test Frontend Design

**Date:** 2026-03-27
**Status:** Approved

## Purpose

A simple test dashboard to verify the Canton scaffold backend is working end-to-end. No contracts, no production concerns — just a way to exercise every tRPC procedure from a browser.

## Architecture

- **Location:** `frontend/` alongside `backend/` in the same repo
- **Stack:** Vite + React + TypeScript + Tailwind CSS
- **tRPC client:** Imports router type directly from `backend/src/index.ts` — no codegen, full type inference at dev time
- **Auth:** Keycloak login form fetches JWT client-side; stored in React state and attached as `Authorization: Bearer` on all tRPC calls

## Layout

Single-page dashboard with tab navigation. Each panel has a form with inputs, a "Send" button, and a raw JSON response display.

| Tab | Procedures |
|-----|-----------|
| Health | `health` |
| Auth | Keycloak login (username + password → JWT + decoded party ID) |
| Registration | `registration.register` |
| Admin | `createRules`, `getRules`, `updateInstruments`, `mintHolding`, `createPreapproval` |
| User | `balances`, `initiateTransfer`, `acceptTransfer`, `rejectTransfer`, `allocations`, `withdrawTransfer` |

## Key Decisions

- **Same repo, separate directory** — keeps types shared without a monorepo tool
- **Vite over Next.js** — no SSR needed, simpler dev setup
- **Client-side Keycloak auth** — avoids proxying through backend, tests real JWT flow
- **Raw JSON display** — no data transformation, shows exactly what the API returns
