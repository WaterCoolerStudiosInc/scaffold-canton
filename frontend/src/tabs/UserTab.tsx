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

export function UserTab({ isAuthenticated }: { isAuthenticated: boolean }) {
  if (!isAuthenticated) {
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
