import { useState } from 'react'
import { trpc, getToken } from '../trpc'
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

function ListPartiesPanel() {
  const [pageToken, setPageToken] = useState('')
  const { loading, result, error, run } = useCall()
  return (
    <Panel title="listParties">
      <div className="max-w-lg">
        <Field label="Page Token (optional)" value={pageToken} onChange={setPageToken} placeholder="leave empty for first page" />
      </div>
      <Btn onClick={() => run(() => trpc.admin.listParties.query({ pageToken: pageToken || undefined }))} loading={loading} label="List Parties" />
      <ResultBox result={result} error={error} />
    </Panel>
  )
}

function ListUsersPanel() {
  const [pageToken, setPageToken] = useState('')
  const { loading, result, error, run } = useCall()
  return (
    <Panel title="listUsers">
      <div className="max-w-lg">
        <Field label="Page Token (optional)" value={pageToken} onChange={setPageToken} placeholder="leave empty for first page" />
      </div>
      <Btn onClick={() => run(() => trpc.admin.listUsers.query({ pageToken: pageToken || undefined }))} loading={loading} label="List Users" />
      <ResultBox result={result} error={error} />
    </Panel>
  )
}

function GetUserPanel() {
  const [userId, setUserId] = useState('')
  const { loading, result, error, run } = useCall()
  return (
    <Panel title="getUser">
      <div className="max-w-lg">
        <Field label="User ID" value={userId} onChange={setUserId} placeholder="keycloak-uuid" />
      </div>
      <Btn onClick={() => run(() => trpc.admin.getUser.query({ userId }))} loading={loading} label="Get User" />
      <ResultBox result={result} error={error} />
    </Panel>
  )
}

function GrantRightsPanel() {
  const [userId, setUserId] = useState('')
  const [partyId, setPartyId] = useState('')
  const { loading, result, error, run } = useCall()
  return (
    <Panel title="grantRights">
      <div className="flex flex-col gap-2 max-w-lg">
        <Field label="User ID" value={userId} onChange={setUserId} placeholder="keycloak-uuid" />
        <Field label="Party ID" value={partyId} onChange={setPartyId} placeholder="party::namespace" />
      </div>
      <Btn onClick={() => run(() => trpc.admin.grantRights.mutate({ userId, partyId }))} loading={loading} label="Grant" />
      <ResultBox result={result} error={error} />
    </Panel>
  )
}

function RevokeRightsPanel() {
  const [userId, setUserId] = useState('')
  const [partyId, setPartyId] = useState('')
  const { loading, result, error, run } = useCall()
  return (
    <Panel title="revokeRights">
      <div className="flex flex-col gap-2 max-w-lg">
        <Field label="User ID" value={userId} onChange={setUserId} placeholder="keycloak-uuid" />
        <Field label="Party ID" value={partyId} onChange={setPartyId} placeholder="party::namespace" />
      </div>
      <Btn onClick={() => run(() => trpc.admin.revokeRights.mutate({ userId, partyId }))} loading={loading} label="Revoke" />
      <ResultBox result={result} error={error} />
    </Panel>
  )
}

function ListPackagesPanel() {
  const { loading, result, error, run } = useCall()
  return (
    <Panel title="listPackages">
      <p className="text-xs text-gray-500 mb-2">Lists all DAR packages uploaded to this participant node.</p>
      <Btn onClick={() => run(() => trpc.admin.listPackages.query())} loading={loading} label="List Packages" />
      <ResultBox result={result} error={error} />
    </Panel>
  )
}

function UploadPackagePanel() {
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [result, setResult] = useState<unknown>(null)
  const [error, setError] = useState<string | null>(null)

  async function upload() {
    if (!files.length) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const before = new Set(await trpc.admin.listPackages.query())
      const token = getToken()
      const headers: Record<string, string> = {
        'Content-Type': 'application/octet-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }
      for (const file of files) {
        const res = await fetch('http://localhost:8080/admin/upload-package', {
          method: 'POST',
          headers,
          body: file,
        })
        const json = await res.json()
        if (!res.ok) throw new Error(`${file.name}: ${json.error ?? `HTTP ${res.status}`}`)
      }
      const after = await trpc.admin.listPackages.query()
      const newPackages = after.filter((id) => !before.has(id))
      setResult({
        uploaded: files.map((f) => f.name),
        newPackages: newPackages.length ? newPackages : '(already installed)',
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Panel title="uploadPackage">
      <p className="text-xs text-gray-500 mb-2">Upload one or more .dar files to the participant node.</p>
      <div className="flex items-center gap-3 max-w-lg">
        <label className="cursor-pointer px-3 py-1.5 bg-gray-100 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-200">
          Choose .dar files
          <input
            type="file"
            accept=".dar"
            multiple
            className="hidden"
            onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])}
          />
        </label>
        <span className="text-sm text-gray-500 truncate">
          {files.length === 0 ? 'No files chosen' : files.length === 1 ? files[0].name : `${files.length} files selected`}
        </span>
      </div>
      <button
        type="button"
        onClick={upload}
        disabled={loading || !files.length}
        className="mt-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded disabled:opacity-50"
      >
        {loading ? 'Uploading…' : 'Upload'}
      </button>
      <ResultBox result={result} error={error} />
    </Panel>
  )
}

function ListKnownTemplatesPanel() {
  const { loading, result, error, run } = useCall()
  return (
    <Panel title="listKnownTemplates">
      <p className="text-xs text-gray-500 mb-2">
        Lists all distinct template IDs indexed by PQS. Use this to find the correct template ID format for your deployed DARs.
      </p>
      <Btn onClick={() => run(() => trpc.admin.listKnownTemplates.query())} loading={loading} label="List Templates" />
      <ResultBox result={result} error={error} />
    </Panel>
  )
}

function GetActiveContractsPanel() {
  const [parties, setParties] = useState('')
  const [templateIds, setTemplateIds] = useState('')
  const [limit, setLimit] = useState('')
  const { loading, result, error, run } = useCall()
  return (
    <Panel title="getActiveContracts">
      <p className="text-xs text-gray-500 mb-2">
        Queries active contracts directly from the ledger API. For large result sets use PQS instead.
      </p>
      <div className="flex flex-col gap-2 max-w-lg">
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Parties (one per line, required)
          <textarea value={parties} onChange={(e) => setParties(e.target.value)}
            rows={2} className="border rounded px-2 py-1.5 text-sm text-gray-900 font-mono" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Template IDs (one per line, optional — leave empty for all)
          <textarea value={templateIds} onChange={(e) => setTemplateIds(e.target.value)}
            rows={2} className="border rounded px-2 py-1.5 text-sm text-gray-900 font-mono"
            placeholder="simple-token-0.1.0:SimpleToken.Holding:SimpleHolding" />
        </label>
        <Field label="Limit (optional)" value={limit} onChange={setLimit} placeholder="100" />
      </div>
      <Btn
        onClick={() => run(() => trpc.admin.getActiveContracts.query({
          parties: parties.split('\n').map((s) => s.trim()).filter(Boolean),
          templateIds: templateIds.split('\n').map((s) => s.trim()).filter(Boolean) || undefined,
          limit: limit ? Number(limit) : undefined,
        }))}
        loading={loading}
        label="Fetch"
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
      <CreateRulesPanel />
      <UpdateInstrumentsPanel />
      <MintHoldingPanel />
      <CreatePreapprovalPanel />
      <ListPartiesPanel />
      <ListUsersPanel />
      <GetUserPanel />
      <GrantRightsPanel />
      <RevokeRightsPanel />
      <UploadPackagePanel />
      <GetActiveContractsPanel />
      <ListPackagesPanel />
      <ListKnownTemplatesPanel />
    </div>
  )
}
