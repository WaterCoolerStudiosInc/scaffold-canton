# Test Frontend Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Scaffold a Vite + React test dashboard in `frontend/` that exercises every tRPC procedure in the Canton scaffold backend.

**Architecture:** Single-page app with tab navigation (Health, Auth, Registration, Admin, User). Imports `AppRouter` type directly from `backend/src/router/index.ts` for full type safety. Auth tab performs Keycloak password-grant login; the JWT is stored in React state and attached to all user/admin tRPC calls.

**Tech Stack:** Vite 6, React 19, TypeScript 5, Tailwind CSS 4, `@trpc/client` v11

---

### Task 1: Scaffold Vite + React + TypeScript project

**Files:**
- Create: `frontend/` (scaffolded by CLI)

**Step 1: Scaffold**

From the repo root:
```bash
cd /Users/brendan/Documents/Dev/wcs/kintsu/canton/scaffold-canton
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

**Step 2: Install Tailwind CSS**

```bash
npm install tailwindcss @tailwindcss/vite
```

**Step 3: Configure Tailwind in vite.config.ts**

Replace `frontend/vite.config.ts` with:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

**Step 4: Add Tailwind import to frontend/src/index.css**

Replace the entire file contents with:
```css
@import "tailwindcss";
```

**Step 5: Verify dev server starts**

```bash
npm run dev
```
Expected: Vite server at `http://localhost:5173`

**Step 6: Commit**

```bash
cd ..
git add frontend/
git commit -m "feat: scaffold vite react frontend"
```

---

### Task 2: Install tRPC client and wire up backend types

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/tsconfig.json`
- Create: `frontend/src/trpc.ts`

**Step 1: Install tRPC client**

```bash
cd frontend
npm install @trpc/client@11
```

**Step 2: Update tsconfig.json to allow importing from backend**

Open `frontend/tsconfig.json`. Add `paths` and `baseUrl` inside `compilerOptions`:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "backend/*": ["../backend/src/*"]
    }
  }
}
```
Keep all existing compilerOptions — only add these two fields.

**Step 3: Update vite.config.ts to resolve the backend alias**

Add `resolve.alias` to the Vite config:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      backend: path.resolve(__dirname, '../backend/src'),
    },
  },
})
```

Also add `"types": ["node"]` to `compilerOptions` in `tsconfig.json` and install the types:
```bash
npm install -D @types/node
```

**Step 4: Create the tRPC client**

Create `frontend/src/trpc.ts`:
```ts
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import type { AppRouter } from 'backend/router/index.js'

// Singleton tRPC client. Auth header injected per-call via getToken().
let _token: string | null = null

export function setToken(token: string | null) {
  _token = token
}

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:8080/trpc',
      headers() {
        return _token ? { Authorization: `Bearer ${_token}` } : {}
      },
    }),
  ],
})
```

**Step 5: Verify TypeScript is happy**

```bash
npx tsc --noEmit
```
Expected: No errors. If you get "Cannot find module 'backend/...'" errors, double-check the `paths` entry in tsconfig.json and the `alias` in vite.config.ts.

**Step 6: Commit**

```bash
cd ..
git add frontend/
git commit -m "feat: wire trpc client with backend type import"
```

---

### Task 3: Build tab layout skeleton

**Files:**
- Modify: `frontend/src/App.tsx`
- Create: `frontend/src/components/TabBar.tsx`
- Create: `frontend/src/components/Panel.tsx`

**Step 1: Create TabBar component**

Create `frontend/src/components/TabBar.tsx`:
```tsx
type Tab = 'health' | 'auth' | 'registration' | 'admin' | 'user'

interface Props {
  active: Tab
  onChange: (tab: Tab) => void
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'health', label: 'Health' },
  { id: 'auth', label: 'Auth' },
  { id: 'registration', label: 'Registration' },
  { id: 'admin', label: 'Admin' },
  { id: 'user', label: 'User' },
]

export function TabBar({ active, onChange }: Props) {
  return (
    <div className="flex border-b border-gray-200 mb-6">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            active === tab.id
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
```

**Step 2: Create Panel component**

Create `frontend/src/components/Panel.tsx`:
```tsx
interface Props {
  title: string
  children: React.ReactNode
}

export function Panel({ title, children }: Props) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 mb-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      {children}
    </div>
  )
}
```

**Step 3: Replace App.tsx with tab shell**

Replace `frontend/src/App.tsx`:
```tsx
import { useState } from 'react'
import { TabBar } from './components/TabBar'

type Tab = 'health' | 'auth' | 'registration' | 'admin' | 'user'

export default function App() {
  const [tab, setTab] = useState<Tab>('health')
  const [token, setToken] = useState<string | null>(null)

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">Canton Scaffold — Test Dashboard</h1>
      <TabBar active={tab} onChange={setTab} />
      <div className="text-gray-400 text-sm">Tab: {tab} (coming soon)</div>
    </div>
  )
}
```

**Step 4: Delete boilerplate**

Delete `frontend/src/assets/react.svg` and remove it from any imports.
Delete contents of `frontend/src/App.css` (leave file empty or delete it).

**Step 5: Verify dev server renders tabs**

```bash
cd frontend && npm run dev
```
Expected: Tab bar visible at localhost:5173.

**Step 6: Commit**

```bash
cd ..
git add frontend/src/
git commit -m "feat: add tab layout skeleton"
```

---

### Task 4: Health tab

**Files:**
- Create: `frontend/src/tabs/HealthTab.tsx`
- Modify: `frontend/src/App.tsx`

**Step 1: Create HealthTab**

Create `frontend/src/tabs/HealthTab.tsx`:
```tsx
import { useState } from 'react'
import { trpc } from '../trpc'
import { Panel } from '../components/Panel'

export function HealthTab() {
  const [result, setResult] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function ping() {
    setLoading(true)
    setError(null)
    try {
      const res = await trpc.health.query()
      setResult(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Panel title="Health Check">
      <button
        onClick={ping}
        disabled={loading}
        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded disabled:opacity-50"
      >
        {loading ? 'Pinging…' : 'Ping'}
      </button>
      {error && <p className="mt-2 text-red-600 text-sm">{error}</p>}
      {result !== null && (
        <pre className="mt-3 p-3 bg-gray-50 rounded text-xs overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </Panel>
  )
}
```

**Step 2: Wire into App.tsx**

Update `frontend/src/App.tsx` to import and render HealthTab when `tab === 'health'`:
```tsx
import { useState } from 'react'
import { TabBar } from './components/TabBar'
import { HealthTab } from './tabs/HealthTab'

type Tab = 'health' | 'auth' | 'registration' | 'admin' | 'user'

export default function App() {
  const [tab, setTab] = useState<Tab>('health')
  const [token, setToken] = useState<string | null>(null)

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">Canton Scaffold — Test Dashboard</h1>
      <TabBar active={tab} onChange={setTab} />
      {tab === 'health' && <HealthTab />}
      {tab !== 'health' && (
        <div className="text-gray-400 text-sm">Tab: {tab} (coming soon)</div>
      )}
    </div>
  )
}
```

**Step 3: Verify**

With backend running (`cd backend && npm run dev`), click Ping in the Health tab.
Expected: `{ "status": "ok" }` displayed.

**Step 4: Commit**

```bash
git add frontend/src/
git commit -m "feat: add health tab"
```

---

### Task 5: Auth tab (Keycloak login)

**Files:**
- Create: `frontend/src/tabs/AuthTab.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/trpc.ts`

**Context:** Keycloak password-grant token endpoint:
`POST {KEYCLOAK_BASE_URL}/realms/{REALM}/protocol/openid-connect/token`
Body: `grant_type=password&client_id=<public-client>&username=<u>&password=<p>`

The `client_id` for user logins is typically a public (no-secret) Keycloak client. This needs to match your Keycloak realm config. Use the env var `VITE_KEYCLOAK_USER_CLIENT_ID` (e.g. `canton-wallet` or `account`) — you'll set this in `frontend/.env.local`.

**Step 1: Create frontend/.env.local**

Create `frontend/.env.local`:
```
VITE_KEYCLOAK_TOKEN_URL=http://localhost:8080/realms/canton/protocol/openid-connect/token
VITE_KEYCLOAK_USER_CLIENT_ID=canton-wallet
```
Adjust values to match your Keycloak setup. The token URL follows the pattern from `KEYCLOAK_BASE_URL` + `/realms/` + `KEYCLOAK_REALM` + `/protocol/openid-connect/token`.

**Step 2: Create AuthTab**

Create `frontend/src/tabs/AuthTab.tsx`:
```tsx
import { useState } from 'react'
import { setToken } from '../trpc'
import { Panel } from '../components/Panel'

interface Props {
  token: string | null
  onLogin: (token: string, partyId: string) => void
  onLogout: () => void
  partyId: string | null
}

function decodeParty(jwt: string): string {
  try {
    const payload = JSON.parse(atob(jwt.split('.')[1]))
    // Canton JWTs embed the party in `sub` or a custom claim
    return payload.sub ?? payload.party ?? payload.preferred_username ?? '(unknown)'
  } catch {
    return '(could not decode)'
  }
}

export function AuthTab({ token, onLogin, onLogout, partyId }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function login() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(import.meta.env.VITE_KEYCLOAK_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'password',
          client_id: import.meta.env.VITE_KEYCLOAK_USER_CLIENT_ID,
          username,
          password,
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Keycloak error ${res.status}: ${text}`)
      }
      const data = await res.json() as { access_token: string }
      const jwt = data.access_token
      setToken(jwt)
      onLogin(jwt, decodeParty(jwt))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  if (token) {
    return (
      <Panel title="Auth — Logged In">
        <p className="text-sm text-green-700 mb-1">Party ID: <code className="bg-gray-100 px-1 rounded">{partyId}</code></p>
        <button
          onClick={() => { setToken(null); onLogout() }}
          className="mt-2 px-3 py-1.5 bg-red-600 text-white text-sm rounded"
        >
          Logout
        </button>
        <details className="mt-3">
          <summary className="text-xs text-gray-500 cursor-pointer">Show JWT</summary>
          <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-auto break-all whitespace-pre-wrap">{token}</pre>
        </details>
      </Panel>
    )
  }

  return (
    <Panel title="Auth — Keycloak Login">
      <div className="flex flex-col gap-2 max-w-sm">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="border rounded px-2 py-1.5 text-sm"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border rounded px-2 py-1.5 text-sm"
        />
        <button
          onClick={login}
          disabled={loading || !username || !password}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded disabled:opacity-50"
        >
          {loading ? 'Logging in…' : 'Login'}
        </button>
      </div>
      {error && <p className="mt-2 text-red-600 text-sm">{error}</p>}
    </Panel>
  )
}
```

**Step 3: Wire token state into App.tsx**

Replace `frontend/src/App.tsx`:
```tsx
import { useState } from 'react'
import { TabBar } from './components/TabBar'
import { HealthTab } from './tabs/HealthTab'
import { AuthTab } from './tabs/AuthTab'

type Tab = 'health' | 'auth' | 'registration' | 'admin' | 'user'

export default function App() {
  const [tab, setTab] = useState<Tab>('health')
  const [token, setToken] = useState<string | null>(null)
  const [partyId, setPartyId] = useState<string | null>(null)

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-2">Canton Scaffold — Test Dashboard</h1>
      {token && (
        <p className="text-xs text-green-700 mb-3">
          Authenticated as: <code className="bg-gray-100 px-1 rounded">{partyId}</code>
        </p>
      )}
      <TabBar active={tab} onChange={setTab} />
      {tab === 'health' && <HealthTab />}
      {tab === 'auth' && (
        <AuthTab
          token={token}
          partyId={partyId}
          onLogin={(t, p) => { setToken(t); setPartyId(p) }}
          onLogout={() => { setToken(null); setPartyId(null) }}
        />
      )}
      {tab !== 'health' && tab !== 'auth' && (
        <div className="text-gray-400 text-sm">Tab: {tab} (coming soon)</div>
      )}
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add frontend/
git commit -m "feat: add auth tab with keycloak login"
```

---

### Task 6: Registration tab

**Files:**
- Create: `frontend/src/tabs/RegistrationTab.tsx`
- Modify: `frontend/src/App.tsx`

**Step 1: Create a shared helper for JSON result display**

Create `frontend/src/components/ResultBox.tsx`:
```tsx
interface Props {
  result: unknown
  error: string | null
}

export function ResultBox({ result, error }: Props) {
  if (error) return <p className="mt-2 text-red-600 text-sm">{error}</p>
  if (result === null || result === undefined) return null
  return (
    <pre className="mt-3 p-3 bg-gray-50 rounded text-xs overflow-auto">
      {JSON.stringify(result, null, 2)}
    </pre>
  )
}
```

**Step 2: Create RegistrationTab**

Create `frontend/src/tabs/RegistrationTab.tsx`:
```tsx
import { useState } from 'react'
import { trpc } from '../trpc'
import { Panel } from '../components/Panel'
import { ResultBox } from '../components/ResultBox'

export function RegistrationTab() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<unknown>(null)
  const [error, setError] = useState<string | null>(null)

  async function register() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await trpc.registration.register.mutate({ username, password })
      setResult(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Panel title="Registration — Register User">
      <div className="flex flex-col gap-2 max-w-sm">
        <input
          type="text"
          placeholder="Username (lowercase, alphanumeric, hyphens)"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="border rounded px-2 py-1.5 text-sm"
        />
        <input
          type="password"
          placeholder="Password (min 8 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border rounded px-2 py-1.5 text-sm"
        />
        <button
          onClick={register}
          disabled={loading || !username || !password}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded disabled:opacity-50"
        >
          {loading ? 'Registering…' : 'Register'}
        </button>
      </div>
      <ResultBox result={result} error={error} />
    </Panel>
  )
}
```

**Step 3: Wire into App.tsx**

Add `import { RegistrationTab } from './tabs/RegistrationTab'` and render it:
```tsx
{tab === 'registration' && <RegistrationTab />}
```

**Step 4: Commit**

```bash
git add frontend/src/
git commit -m "feat: add registration tab"
```

---

### Task 7: Admin tab

**Files:**
- Create: `frontend/src/tabs/AdminTab.tsx`
- Modify: `frontend/src/App.tsx`

**Context:** Admin procedures require a JWT where `isAdmin` resolves to true (the backend checks the party matches `APP_PROVIDER_PARTY`). Login as the admin user in the Auth tab first.

**Step 1: Create a shared field component for reuse**

Create `frontend/src/components/Field.tsx`:
```tsx
interface Props {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}

export function Field({ label, value, onChange, placeholder, type = 'text' }: Props) {
  return (
    <label className="flex flex-col gap-1 text-xs text-gray-600">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border rounded px-2 py-1.5 text-sm text-gray-900"
      />
    </label>
  )
}
```

**Step 2: Create AdminTab**

Create `frontend/src/tabs/AdminTab.tsx`:
```tsx
import { useState } from 'react'
import { trpc } from '../trpc'
import { Panel } from '../components/Panel'
import { Field } from '../components/Field'
import { ResultBox } from '../components/ResultBox'

function useCall<T>() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run(fn: () => Promise<T>) {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      setResult(await fn())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return { loading, result, error, run }
}

function Btn({ onClick, loading, label }: { onClick: () => void; loading: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="mt-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded disabled:opacity-50"
    >
      {loading ? 'Loading…' : label}
    </button>
  )
}

// --- getRules ---
function GetRulesPanel() {
  const { loading, result, error, run } = useCall()
  return (
    <Panel title="getRules">
      <Btn onClick={() => run(() => trpc.admin.getRules.query())} loading={loading} label="Get Rules" />
      <ResultBox result={result} error={error} />
    </Panel>
  )
}

// --- createRules ---
function CreateRulesPanel() {
  const [instruments, setInstruments] = useState('')
  const { loading, result, error, run } = useCall()
  return (
    <Panel title="createRules">
      <label className="flex flex-col gap-1 text-xs text-gray-600">
        Supported Instruments (one per line)
        <textarea
          value={instruments}
          onChange={(e) => setInstruments(e.target.value)}
          rows={3}
          placeholder="instrument-id-1&#10;instrument-id-2"
          className="border rounded px-2 py-1.5 text-sm text-gray-900 font-mono"
        />
      </label>
      <Btn
        onClick={() =>
          run(() =>
            trpc.admin.createRules.mutate({
              supportedInstruments: instruments.split('\n').map((s) => s.trim()).filter(Boolean),
            })
          )
        }
        loading={loading}
        label="Create Rules"
      />
      <ResultBox result={result} error={error} />
    </Panel>
  )
}

// --- updateInstruments ---
function UpdateInstrumentsPanel() {
  const [rulesContractId, setRulesContractId] = useState('')
  const [instruments, setInstruments] = useState('')
  const { loading, result, error, run } = useCall()
  return (
    <Panel title="updateInstruments">
      <div className="flex flex-col gap-2 max-w-lg">
        <Field label="Rules Contract ID" value={rulesContractId} onChange={setRulesContractId} placeholder="contract-id" />
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Supported Instruments (one per line)
          <textarea
            value={instruments}
            onChange={(e) => setInstruments(e.target.value)}
            rows={3}
            className="border rounded px-2 py-1.5 text-sm text-gray-900 font-mono"
          />
        </label>
      </div>
      <Btn
        onClick={() =>
          run(() =>
            trpc.admin.updateInstruments.mutate({
              rulesContractId,
              supportedInstruments: instruments.split('\n').map((s) => s.trim()).filter(Boolean),
            })
          )
        }
        loading={loading}
        label="Update Instruments"
      />
      <ResultBox result={result} error={error} />
    </Panel>
  )
}

// --- mintHolding ---
function MintHoldingPanel() {
  const [owner, setOwner] = useState('')
  const [adminParty, setAdminParty] = useState('')
  const [instrumentId, setInstrumentId] = useState('')
  const [amount, setAmount] = useState('')
  const { loading, result, error, run } = useCall()
  return (
    <Panel title="mintHolding">
      <div className="flex flex-col gap-2 max-w-lg">
        <Field label="Owner Party" value={owner} onChange={setOwner} />
        <Field label="Instrument Admin Party" value={adminParty} onChange={setAdminParty} />
        <Field label="Instrument ID" value={instrumentId} onChange={setInstrumentId} />
        <Field label="Amount" value={amount} onChange={setAmount} placeholder="100" />
      </div>
      <Btn
        onClick={() =>
          run(() =>
            trpc.admin.mintHolding.mutate({
              owner,
              instrumentId: { admin: adminParty, id: instrumentId },
              amount,
            })
          )
        }
        loading={loading}
        label="Mint"
      />
      <ResultBox result={result} error={error} />
    </Panel>
  )
}

// --- createPreapproval ---
function CreatePreapprovalPanel() {
  const [receiver, setReceiver] = useState('')
  const [adminParty, setAdminParty] = useState('')
  const [instrumentId, setInstrumentId] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const { loading, result, error, run } = useCall()
  return (
    <Panel title="createPreapproval">
      <div className="flex flex-col gap-2 max-w-lg">
        <Field label="Receiver Party" value={receiver} onChange={setReceiver} />
        <Field label="Instrument Admin Party" value={adminParty} onChange={setAdminParty} />
        <Field label="Instrument ID" value={instrumentId} onChange={setInstrumentId} />
        <Field label="Expires At (ISO 8601, optional)" value={expiresAt} onChange={setExpiresAt} placeholder="2026-12-31T00:00:00Z" />
      </div>
      <Btn
        onClick={() =>
          run(() =>
            trpc.admin.createPreapproval.mutate({
              receiver,
              instrumentId: { admin: adminParty, id: instrumentId },
              expiresAt: expiresAt || null,
            })
          )
        }
        loading={loading}
        label="Create Preapproval"
      />
      <ResultBox result={result} error={error} />
    </Panel>
  )
}

export function AdminTab() {
  return (
    <div>
      <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2 mb-4">
        Admin procedures require you to be logged in as the admin party (APP_PROVIDER_PARTY).
      </p>
      <GetRulesPanel />
      <CreateRulesPanel />
      <UpdateInstrumentsPanel />
      <MintHoldingPanel />
      <CreatePreapprovalPanel />
    </div>
  )
}
```

**Step 3: Wire into App.tsx**

Add `import { AdminTab } from './tabs/AdminTab'` and render it:
```tsx
{tab === 'admin' && <AdminTab />}
```

**Step 4: Commit**

```bash
git add frontend/src/
git commit -m "feat: add admin tab"
```

---

### Task 8: User tab

**Files:**
- Create: `frontend/src/tabs/UserTab.tsx`
- Modify: `frontend/src/App.tsx`

**Context:** User procedures require a JWT with a valid Canton party ID. Login via the Auth tab first.

**Step 1: Create UserTab**

Create `frontend/src/tabs/UserTab.tsx`:
```tsx
import { useState } from 'react'
import { trpc } from '../trpc'
import { Panel } from '../components/Panel'
import { Field } from '../components/Field'
import { ResultBox } from '../components/ResultBox'

function useCall<T>() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  async function run(fn: () => Promise<T>) {
    setLoading(true); setError(null); setResult(null)
    try { setResult(await fn()) } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setLoading(false) }
  }
  return { loading, result, error, run }
}

function Btn({ onClick, loading, label }: { onClick: () => void; loading: boolean; label: string }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="mt-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded disabled:opacity-50">
      {loading ? 'Loading…' : label}
    </button>
  )
}

function QueryPanel({ title, fn }: { title: string; fn: () => Promise<unknown> }) {
  const { loading, result, error, run } = useCall()
  return (
    <Panel title={title}>
      <Btn onClick={() => run(fn)} loading={loading} label="Fetch" />
      <ResultBox result={result} error={error} />
    </Panel>
  )
}

function ContractIdPanel({ title, label, fn }: { title: string; label: string; fn: (id: string) => Promise<unknown> }) {
  const [contractId, setContractId] = useState('')
  const { loading, result, error, run } = useCall()
  return (
    <Panel title={title}>
      <div className="max-w-lg">
        <Field label="Contract ID" value={contractId} onChange={setContractId} placeholder="contract-id" />
      </div>
      <Btn onClick={() => run(() => fn(contractId))} loading={loading} label={label} />
      <ResultBox result={result} error={error} />
    </Panel>
  )
}

function InitiateTransferPanel() {
  const [rulesContractId, setRulesContractId] = useState('')
  const [holdingCids, setHoldingCids] = useState('')
  const [receiver, setReceiver] = useState('')
  const [adminParty, setAdminParty] = useState('')
  const [instrumentId, setInstrumentId] = useState('')
  const [amount, setAmount] = useState('')
  const [executeBefore, setExecuteBefore] = useState('')
  const [preapprovalCid, setPreapprovalCid] = useState('')
  const { loading, result, error, run } = useCall()

  return (
    <Panel title="initiateTransfer">
      <div className="flex flex-col gap-2 max-w-lg">
        <Field label="Rules Contract ID" value={rulesContractId} onChange={setRulesContractId} />
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Input Holding CIDs (one per line)
          <textarea value={holdingCids} onChange={(e) => setHoldingCids(e.target.value)}
            rows={2} className="border rounded px-2 py-1.5 text-sm text-gray-900 font-mono" />
        </label>
        <Field label="Receiver Party" value={receiver} onChange={setReceiver} />
        <Field label="Instrument Admin Party" value={adminParty} onChange={setAdminParty} />
        <Field label="Instrument ID" value={instrumentId} onChange={setInstrumentId} />
        <Field label="Amount" value={amount} onChange={setAmount} />
        <Field label="Execute Before (ISO 8601)" value={executeBefore} onChange={setExecuteBefore} placeholder="2026-12-31T00:00:00Z" />
        <Field label="Preapproval CID (optional)" value={preapprovalCid} onChange={setPreapprovalCid} />
      </div>
      <Btn
        onClick={() => run(() => trpc.user.initiateTransfer.mutate({
          rulesContractId,
          inputHoldingCids: holdingCids.split('\n').map(s => s.trim()).filter(Boolean),
          receiver,
          instrumentId: { admin: adminParty, id: instrumentId },
          amount,
          executeBefore,
          preapprovalCid: preapprovalCid || undefined,
        }))}
        loading={loading}
        label="Initiate Transfer"
      />
      <ResultBox result={result} error={error} />
    </Panel>
  )
}

export function UserTab({ token }: { token: string | null }) {
  if (!token) {
    return <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-3">Login in the Auth tab first.</p>
  }

  return (
    <div>
      <QueryPanel title="getHoldings" fn={() => trpc.user.getHoldings.query()} />
      <QueryPanel title="getLockedHoldings" fn={() => trpc.user.getLockedHoldings.query()} />
      <QueryPanel title="getPendingTransfers" fn={() => trpc.user.getPendingTransfers.query()} />
      <QueryPanel title="getAllocations" fn={() => trpc.user.getAllocations.query()} />
      <InitiateTransferPanel />
      <ContractIdPanel title="acceptTransfer" label="Accept" fn={(id) => trpc.user.acceptTransfer.mutate({ contractId: id })} />
      <ContractIdPanel title="rejectTransfer" label="Reject" fn={(id) => trpc.user.rejectTransfer.mutate({ contractId: id })} />
      <ContractIdPanel title="withdrawTransfer" label="Withdraw" fn={(id) => trpc.user.withdrawTransfer.mutate({ contractId: id })} />
      <ContractIdPanel title="cancelAllocation" label="Cancel" fn={(id) => trpc.user.cancelAllocation.mutate({ contractId: id })} />
      <ContractIdPanel title="withdrawAllocation" label="Withdraw" fn={(id) => trpc.user.withdrawAllocation.mutate({ contractId: id })} />
    </div>
  )
}
```

**Step 2: Wire into App.tsx**

Add `import { UserTab } from './tabs/UserTab'` and render it, passing the token:
```tsx
{tab === 'user' && <UserTab token={token} />}
```

Final `App.tsx` should render all 5 tabs. Replace fully:
```tsx
import { useState } from 'react'
import { TabBar } from './components/TabBar'
import { HealthTab } from './tabs/HealthTab'
import { AuthTab } from './tabs/AuthTab'
import { RegistrationTab } from './tabs/RegistrationTab'
import { AdminTab } from './tabs/AdminTab'
import { UserTab } from './tabs/UserTab'

type Tab = 'health' | 'auth' | 'registration' | 'admin' | 'user'

export default function App() {
  const [tab, setTab] = useState<Tab>('health')
  const [token, setToken] = useState<string | null>(null)
  const [partyId, setPartyId] = useState<string | null>(null)

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-2">Canton Scaffold — Test Dashboard</h1>
      {token && (
        <p className="text-xs text-green-700 mb-3">
          Authenticated as: <code className="bg-gray-100 px-1 rounded">{partyId}</code>
        </p>
      )}
      <TabBar active={tab} onChange={setTab} />
      {tab === 'health' && <HealthTab />}
      {tab === 'auth' && (
        <AuthTab
          token={token}
          partyId={partyId}
          onLogin={(t, p) => { setToken(t); setPartyId(p) }}
          onLogout={() => { setToken(null); setPartyId(null) }}
        />
      )}
      {tab === 'registration' && <RegistrationTab />}
      {tab === 'admin' && <AdminTab />}
      {tab === 'user' && <UserTab token={token} />}
    </div>
  )
}
```

**Step 3: Final type check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: No errors.

**Step 4: Commit**

```bash
cd ..
git add frontend/src/
git commit -m "feat: add user tab — completes test dashboard"
```

---

### Task 9: Configure CORS on backend

**Files:**
- Modify: `backend/src/index.ts`

**Context:** The browser will make requests from `localhost:5173` to `localhost:8080`. Without CORS headers, every fetch will fail.

**Step 1: Install Hono CORS middleware**

```bash
cd backend
npm install hono
```
(Already installed — just verifying.)

**Step 2: Add CORS middleware to backend/src/index.ts**

Add the import at the top:
```ts
import { cors } from 'hono/cors'
```

Add the middleware before the tRPC route (after `const app = new Hono()`):
```ts
app.use('*', cors({
  origin: 'http://localhost:5173',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
}))
```

**Step 3: Restart backend and verify**

```bash
npm run dev
```

Open browser devtools → Network tab → click Ping in Health tab.
Expected: No CORS errors, response `{ "status": "ok" }`.

**Step 4: Commit**

```bash
cd ..
git add backend/src/index.ts
git commit -m "fix: add cors middleware for local frontend dev"
```

---

### Task 10: Final smoke test

**Step 1: Start both servers**

Terminal 1:
```bash
cd backend && npm run dev
```

Terminal 2:
```bash
cd frontend && npm run dev
```

**Step 2: Run through checklist**

- [ ] Health tab → Ping → returns `{ "status": "ok" }`
- [ ] Auth tab → login with a test user → party ID shown
- [ ] Registration tab → register a new username → contract ID returned
- [ ] Admin tab → getRules → result displayed (may be empty if rules not yet created)
- [ ] User tab → getHoldings → result displayed (may be empty)

**Step 3: Note the Keycloak client ID**

If Auth login fails with a Keycloak error, the `VITE_KEYCLOAK_USER_CLIENT_ID` in `frontend/.env.local` needs to match an actual public client configured in your Keycloak realm. Check your Keycloak admin console → Clients to find the right client ID.
