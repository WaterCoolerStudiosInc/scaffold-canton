import { useState } from 'react'
import { trpc } from '../trpc'
import { Panel } from '../components/Panel'
import { Field } from '../components/Field'
import { ResultBox } from '../components/ResultBox'

function useCall() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<unknown>(null)
  const [error, setError] = useState<string | null>(null)
  async function run(fn: () => Promise<unknown>) {
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

function GetHoldingByIdPanel() {
  const [contractId, setContractId] = useState('')
  const { loading, result, error, run } = useCall()
  return (
    <Panel title="getHoldingById">
      <div className="max-w-lg">
        <Field label="Contract ID" value={contractId} onChange={setContractId} placeholder="contract-id" />
      </div>
      <Btn onClick={() => run(() => trpc.user.getHoldingById.query({ contractId }))} loading={loading} label="Fetch" />
      <ResultBox result={result} error={error} />
    </Panel>
  )
}

function LookupContractPanel() {
  const [contractId, setContractId] = useState('')
  const { loading, result, error, run } = useCall()
  return (
    <Panel title="lookupContract">
      <p className="text-xs text-gray-500 mb-2">Looks up any contract by ID — including archived ones.</p>
      <div className="max-w-lg">
        <Field label="Contract ID" value={contractId} onChange={setContractId} placeholder="00abc123..." />
      </div>
      <Btn onClick={() => run(() => trpc.admin.lookupContract.query({ contractId }))} loading={loading} label="Lookup" />
      <ResultBox result={result} error={error} />
    </Panel>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mt-6 mb-2 border-b border-gray-100 pb-1">
      {label}
    </h4>
  )
}

export function PqsTab({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <div>
      <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded p-2 mb-4">
        All queries on this tab read from the <strong>Participant Query Store (PQS)</strong> — a PostgreSQL index of active Daml contracts. Results reflect ledger state with a small sync delay.
      </p>
      {!isAuthenticated && (
        <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
          Login in the Auth tab to query user-specific contracts.
        </p>
      )}

      <SectionHeader label="User — Holdings" />
      <QueryPanel title="getHoldings" fn={() => trpc.user.getHoldings.query()} />
      <QueryPanel title="getLockedHoldings" fn={() => trpc.user.getLockedHoldings.query()} />
      <GetHoldingByIdPanel />

      <SectionHeader label="User — Transfers & Preapprovals" />
      <QueryPanel title="getPendingTransfers" fn={() => trpc.user.getPendingTransfers.query()} />
      <QueryPanel title="getPreapprovals" fn={() => trpc.user.getPreapprovals.query()} />

      <SectionHeader label="User — Allocations" />
      <QueryPanel title="getAllocations" fn={() => trpc.user.getAllocations.query()} />

      <SectionHeader label="Admin — Rules" />
      <QueryPanel title="getRules" fn={() => trpc.admin.getRules.query()} />

      <SectionHeader label="Admin — Ledger" />
      <QueryPanel title="getTemplateSummary" fn={() => trpc.admin.getTemplateSummary.query()} />
      <QueryPanel title="getAllActiveContracts" fn={() => trpc.admin.getAllActiveContracts.query()} />
      <LookupContractPanel />
    </div>
  )
}
