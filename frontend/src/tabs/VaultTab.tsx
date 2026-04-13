import { useState } from 'react'
import { gatewaySdk } from '../wallet/gatewaySdk'
import { trpc } from '../trpc'
import { TEMPLATE_IDS } from 'backend/generated/template-ids.js'
import { Panel } from '../components/Panel'
import { Field } from '../components/Field'
import { ResultBox } from '../components/ResultBox'

const ADMIN_PARTY = import.meta.env.VITE_ADMIN_PARTY as string | undefined ??
  'cenote-validator-1::122086f247427832e8927f8652085f4950311a77bd3fab89197e708dae70802e4d1d'

interface Props {
  walletPartyId: string | null
  isAdmin: boolean
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalize(v: unknown): unknown {
  if (v === null || v === undefined) return v
  try { return JSON.parse(JSON.stringify(v)) } catch { return String(v) }
}

function useCall() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<unknown>(null)
  const [error, setError] = useState<string | null>(null)
  async function run(fn: () => Promise<unknown>) {
    setLoading(true); setError(null); setResult(null)
    try { setResult(normalize(await fn())) }
    catch (e) {
      console.error('useCall error:', e)
      setError(e instanceof Error ? e.message : String(e))
    } finally { setLoading(false) }
  }
  return { loading, result, error, run }
}

function Btn({ onClick, loading, label, disabled }: { onClick: () => void; loading: boolean; label: string; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={loading || disabled}
      className="mt-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded disabled:opacity-50">
      {loading ? 'Working…' : label}
    </button>
  )
}

// ── Read: deposits & requests (public PQS — works for everyone) ──────────────

function DepositsPanel({ partyId }: { partyId: string }) {
  const reqCall = useCall()
  const depCall = useCall()

  return (
    <Panel title="deposits">
      <div className="flex gap-2">
        <Btn onClick={() => reqCall.run(() => trpc.vault.depositRequests.query({ partyId }))}
          loading={reqCall.loading} label="Pending requests" />
        <Btn onClick={() => depCall.run(() => trpc.vault.deposits.query({ partyId }))}
          loading={depCall.loading} label="Confirmed deposits" />
      </div>
      {reqCall.error && <p className="mt-1 text-xs text-red-600">{reqCall.error}</p>}
      <ResultBox result={reqCall.result} error={null} />
      {depCall.error && <p className="mt-1 text-xs text-red-600">{depCall.error}</p>}
      <ResultBox result={depCall.result} error={null} />
    </Panel>
  )
}

// ── User: create deposit request (wallet gateway) ────────────────────────────

function CreateDepositPanel({ partyId }: { partyId: string }) {
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const { loading, result, error, run } = useCall()

  return (
    <Panel title="create deposit request">
      <p className="text-xs text-gray-500 mb-2">
        Creates a DepositRequest via the wallet gateway. After approval, the admin must accept it.
      </p>
      <div className="flex flex-col gap-2 max-w-lg">
        <Field label="Amount" value={amount} onChange={setAmount} placeholder="100.0" />
        <Field label="Memo" value={memo} onChange={setMemo} placeholder="optional note" />
      </div>
      <Btn
        onClick={() => run(async () => {
          const res = await gatewaySdk.prepareExecute({
            commands: [{
              CreateCommand: {
                templateId: TEMPLATE_IDS.DepositRequest,
                createArguments: { user: partyId, admin: ADMIN_PARTY, amount, memo },
              },
            }],
          })
          return res ?? { status: 'submitted — approve in wallet gateway' }
        })}
        loading={loading}
        label="Submit deposit request"
        disabled={!amount}
      />
      <ResultBox result={result} error={error} />
    </Panel>
  )
}

// ── User: withdraw deposit (wallet gateway) ──────────────────────────────────

function WithdrawPanel() {
  const [contractId, setContractId] = useState('')
  const { loading, result, error, run } = useCall()

  return (
    <Panel title="withdraw deposit">
      <p className="text-xs text-gray-500 mb-2">
        Withdraw a confirmed deposit via the wallet gateway.
      </p>
      <div className="max-w-lg">
        <Field label="Deposit contract ID" value={contractId} onChange={setContractId} />
      </div>
      <Btn
        onClick={() => run(async () => {
          const res = await gatewaySdk.prepareExecute({
            commands: [{
              ExerciseCommand: {
                templateId: TEMPLATE_IDS.Deposit,
                contractId,
                choice: 'Deposit_Withdraw',
                choiceArgument: {},
              },
            }],
          })
          return res ?? { status: 'submitted — approve in wallet gateway' }
        })}
        loading={loading}
        label="Withdraw"
        disabled={!contractId}
      />
      <ResultBox result={result} error={error} />
    </Panel>
  )
}

// ── Admin: accept deposit request (tRPC / Keycloak) ──────────────────────────

function AcceptDepositPanel() {
  const [contractId, setContractId] = useState('')
  const { loading, result, error, run } = useCall()
  return (
    <Panel title="accept deposit request (admin)">
      <div className="max-w-lg">
        <Field label="DepositRequest contract ID" value={contractId} onChange={setContractId} />
      </div>
      <Btn onClick={() => run(() => trpc.user.acceptDeposit.mutate({ contractId }))}
        loading={loading} label="Accept" disabled={!contractId} />
      <ResultBox result={result} error={error} />
    </Panel>
  )
}

// ── Admin: release deposit (tRPC / Keycloak) ─────────────────────────────────

function ReleaseDepositPanel() {
  const [contractId, setContractId] = useState('')
  const { loading, result, error, run } = useCall()
  return (
    <Panel title="release deposit (admin)">
      <div className="max-w-lg">
        <Field label="Deposit contract ID" value={contractId} onChange={setContractId} />
      </div>
      <Btn onClick={() => run(() => trpc.user.releaseDeposit.mutate({ contractId }))}
        loading={loading} label="Release" disabled={!contractId} />
      <ResultBox result={result} error={error} />
    </Panel>
  )
}

// ── Main tab ─────────────────────────────────────────────────────────────────

export function VaultTab({ walletPartyId, isAdmin }: Props) {
  const partyId = walletPartyId ?? ''

  return (
    <div>
      {/* Reads — always visible */}
      <DepositsPanel partyId={isAdmin ? ADMIN_PARTY : partyId} />

      {/* User actions — wallet gateway */}
      {walletPartyId && (
        <>
          <CreateDepositPanel partyId={walletPartyId} />
          <WithdrawPanel />
        </>
      )}

      {/* Admin actions — Keycloak */}
      {isAdmin && (
        <>
          <AcceptDepositPanel />
          <ReleaseDepositPanel />
        </>
      )}

      {!walletPartyId && !isAdmin && (
        <p className="mt-4 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-3">
          Connect a wallet or sign in as admin in the Auth tab to interact with the vault.
        </p>
      )}
    </div>
  )
}
