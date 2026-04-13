import { useState, useCallback, useEffect } from 'react'
import { useAuth } from 'react-oidc-context'
import { RemoteAdapter } from '@canton-network/dapp-sdk'
import type { StatusEvent } from '@canton-network/dapp-sdk'
import { gatewaySdk } from '../wallet/gatewaySdk'
import { Panel } from '../components/Panel'

interface Props {
  partyId: string | null
  walletPartyId: string | null
  onWalletConnect: (partyId: string, token: string) => void
  onWalletDisconnect: () => void
}

// ── Wallet Gateway ───────────────────────────────────────────────────────────

function walletGatewayRpcUrl(): string | undefined {
  const base = import.meta.env.VITE_WALLET_GATEWAY_URL as string | undefined
  if (!base) return undefined
  const trimmed = base.replace(/\/$/, '')
  return trimmed.endsWith('/api/v0/dapp') ? trimmed : `${trimmed}/api/v0/dapp`
}

function WalletGatewayPanel({
  walletPartyId,
  onWalletConnect,
  onWalletDisconnect,
}: {
  walletPartyId: string | null
  onWalletConnect: (partyId: string, token: string) => void
  onWalletDisconnect: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gwStatus, setGwStatus] = useState<StatusEvent | null>(null)

  const rpcUrl = walletGatewayRpcUrl()

  const resolveAuth = useCallback(async () => {
    try {
      const s = await gatewaySdk.status().catch(() => null)
      if (!s?.connection?.isConnected) return
      setGwStatus(s)
      const token = s.session?.accessToken ?? s.network?.accessToken ?? ''
      const accs = await gatewaySdk.listAccounts().catch(() => [])
      const primary = accs.find(w => w.primary)
      if (primary) onWalletConnect(primary.partyId, token)
    } catch (e) {
      console.error('resolveAuth error:', e)
    }
  }, [onWalletConnect])

  const handleStatus = useCallback((s: StatusEvent) => {
    setGwStatus(s)
    if (s.connection?.isConnected) void resolveAuth()
    else onWalletDisconnect()
  }, [onWalletDisconnect, resolveAuth])

  useEffect(() => {
    void gatewaySdk.onStatusChanged(handleStatus).catch(() => {})
    return () => { void gatewaySdk.removeOnStatusChanged(handleStatus).catch(() => {}) }
  }, [handleStatus])

  async function connect() {
    if (!rpcUrl) return
    setLoading(true)
    setError(null)
    try {
      const result = await gatewaySdk.connect({
        additionalAdapters: [
          new RemoteAdapter({ name: 'Wallet Gateway', rpcUrl, description: 'Local wallet gateway' }),
        ],
      })
      if (result.isConnected) await resolveAuth()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  async function disconnect() {
    setLoading(true)
    try { await gatewaySdk.disconnect().catch(() => {}) } catch { /* */ }
    onWalletDisconnect()
    setGwStatus(null)
    setLoading(false)
  }

  if (!rpcUrl) {
    return (
      <Panel title="Wallet">
        <p className="text-xs text-amber-800">
          Set <code className="bg-amber-50 px-1">VITE_WALLET_GATEWAY_URL</code> in{' '}
          <code className="bg-amber-50 px-1">.env.local</code>.
        </p>
      </Panel>
    )
  }

  if (walletPartyId) {
    return (
      <Panel title="Wallet — connected">
        <p className="text-sm text-green-700 mb-2">
          Party: <code className="bg-gray-100 px-1 rounded text-xs break-all">{walletPartyId}</code>
        </p>
        {gwStatus && (
          <p className="text-xs text-gray-500 mb-2">Provider: {gwStatus.provider?.providerType ?? '—'}</p>
        )}
        <button onClick={disconnect} disabled={loading}
          className="px-3 py-1.5 bg-red-600 text-white text-sm rounded disabled:opacity-50">
          {loading ? 'Working…' : 'Disconnect'}
        </button>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </Panel>
    )
  }

  return (
    <Panel title="Wallet">
      <p className="text-xs text-gray-500 mb-3">
        Connect via the wallet gateway. Creates an external party on your validator.
      </p>
      <button onClick={connect} disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50">
        {loading ? 'Connecting…' : 'Connect wallet'}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </Panel>
  )
}

// ── Keycloak (admin) ─────────────────────────────────────────────────────────

function AdminLoginPanel({ partyId }: { partyId: string | null }) {
  const auth = useAuth()

  if (auth.isAuthenticated) {
    return (
      <Panel title="Admin (Keycloak) — signed in">
        <p className="text-sm text-green-700 mb-2">
          Party: <code className="bg-gray-100 px-1 rounded text-xs">{partyId ?? '…'}</code>
        </p>
        <button onClick={() => auth.signoutRedirect()}
          className="px-3 py-1.5 bg-red-600 text-white text-sm rounded">
          Logout
        </button>
      </Panel>
    )
  }

  return (
    <Panel title="Admin (Keycloak)">
      <p className="text-xs text-gray-500 mb-3">
        Admin login for accepting deposits and managing contracts.
      </p>
      <button onClick={() => auth.signinRedirect()}
        className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700">
        Admin login
      </button>
      {auth.error && <p className="mt-2 text-xs text-red-600">{auth.error.message}</p>}
    </Panel>
  )
}

// ── Auth Tab ─────────────────────────────────────────────────────────────────

export function AuthTab({ partyId, walletPartyId, onWalletConnect, onWalletDisconnect }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <WalletGatewayPanel
        walletPartyId={walletPartyId}
        onWalletConnect={onWalletConnect}
        onWalletDisconnect={onWalletDisconnect}
      />
      <AdminLoginPanel partyId={partyId} />
    </div>
  )
}
