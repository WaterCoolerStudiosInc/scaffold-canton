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

function GetRulesPanel() {
  const { loading, result, error, run } = useCall()
  return (
    <Panel title="getRules">
      <Btn onClick={() => run(() => trpc.admin.getRules.query())} loading={loading} label="Get Rules" />
      <ResultBox result={result} error={error} />
    </Panel>
  )
}

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
