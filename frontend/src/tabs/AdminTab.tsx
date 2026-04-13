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
    setLoading(true); setError(null); setResult(null)
    try { setResult(await fn()) }
    catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally { setLoading(false) }
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

function UploadPackagePanel() {
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [result, setResult] = useState<unknown>(null)
  const [error, setError] = useState<string | null>(null)

  async function upload() {
    if (!files.length) return
    setLoading(true); setError(null); setResult(null)
    try {
      const token = getToken()
      for (const file of files) {
        const res = await fetch('http://localhost:8080/admin/upload-package', {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: file,
        })
        const json = await res.json()
        if (!res.ok) throw new Error(`${file.name}: ${json.error ?? `HTTP ${res.status}`}`)
      }
      setResult({ uploaded: files.map(f => f.name) })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally { setLoading(false) }
  }

  return (
    <Panel title="uploadPackage">
      <p className="text-xs text-gray-500 mb-2">Upload .dar files to the participant node.</p>
      <div className="flex items-center gap-3 max-w-lg">
        <label className="cursor-pointer px-3 py-1.5 bg-gray-100 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-200">
          Choose .dar files
          <input type="file" accept=".dar" multiple className="hidden"
            onChange={e => setFiles(e.target.files ? Array.from(e.target.files) : [])} />
        </label>
        <span className="text-sm text-gray-500 truncate">
          {files.length === 0 ? 'No files chosen' : files.length === 1 ? files[0].name : `${files.length} files`}
        </span>
      </div>
      <button type="button" onClick={upload} disabled={loading || !files.length}
        className="mt-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded disabled:opacity-50">
        {loading ? 'Uploading…' : 'Upload'}
      </button>
      <ResultBox result={result} error={error} />
    </Panel>
  )
}

function ListPackagesPanel() {
  const { loading, result, error, run } = useCall()
  return (
    <Panel title="listPackages">
      <Btn onClick={() => run(() => trpc.admin.listPackages.query())} loading={loading} label="List Packages" />
      <ResultBox result={result} error={error} />
    </Panel>
  )
}

function ListKnownTemplatesPanel() {
  const { loading, result, error, run } = useCall()
  return (
    <Panel title="listKnownTemplates (PQS)">
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
      <div className="flex flex-col gap-2 max-w-lg">
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Parties (one per line)
          <textarea value={parties} onChange={e => setParties(e.target.value)}
            rows={2} className="border rounded px-2 py-1.5 text-sm text-gray-900 font-mono" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Template IDs (one per line, optional)
          <textarea value={templateIds} onChange={e => setTemplateIds(e.target.value)}
            rows={2} className="border rounded px-2 py-1.5 text-sm text-gray-900 font-mono"
            placeholder="Vault:DepositRequest" />
        </label>
        <Field label="Limit (optional)" value={limit} onChange={setLimit} placeholder="100" />
      </div>
      <Btn
        onClick={() => run(() => trpc.admin.getActiveContracts.query({
          parties: parties.split('\n').map(s => s.trim()).filter(Boolean),
          templateIds: templateIds.split('\n').map(s => s.trim()).filter(Boolean) || undefined,
          limit: limit ? Number(limit) : undefined,
        }))}
        loading={loading} label="Fetch"
      />
      <ResultBox result={result} error={error} />
    </Panel>
  )
}

function TemplateSummaryPanel() {
  const { loading, result, error, run } = useCall()
  return (
    <Panel title="templateSummary">
      <Btn onClick={() => run(() => trpc.admin.getTemplateSummary.query())} loading={loading} label="Get Summary" />
      <ResultBox result={result} error={error} />
    </Panel>
  )
}

function LookupContractPanel() {
  const [contractId, setContractId] = useState('')
  const { loading, result, error, run } = useCall()
  return (
    <Panel title="lookupContract">
      <div className="max-w-lg">
        <Field label="Contract ID" value={contractId} onChange={setContractId} placeholder="contract-id" />
      </div>
      <Btn onClick={() => run(() => trpc.admin.lookupContract.query({ contractId }))} loading={loading} label="Lookup" />
      <ResultBox result={result} error={error} />
    </Panel>
  )
}

export function AdminTab() {
  return (
    <div>
      <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2 mb-4">
        Admin procedures require Keycloak login as the admin party.
      </p>
      <UploadPackagePanel />
      <ListPackagesPanel />
      <ListKnownTemplatesPanel />
      <TemplateSummaryPanel />
      <GetActiveContractsPanel />
      <LookupContractPanel />
      <ListPartiesPanel />
      <ListUsersPanel />
      <GetUserPanel />
      <GrantRightsPanel />
      <RevokeRightsPanel />
    </div>
  )
}
