import { useState, useEffect, useCallback } from 'react'
import { useAuth } from 'react-oidc-context'
import { TabBar, type Tab } from './components/TabBar'
import { AuthTab } from './tabs/AuthTab'
import { VaultTab } from './tabs/VaultTab'
import { AdminTab } from './tabs/AdminTab'
import { PqsTab } from './tabs/PqsTab'
import { RegistrationTab } from './tabs/RegistrationTab'
import { HealthTab } from './tabs/HealthTab'
import { setToken, setPartyHint, trpc } from './trpc'

export default function App() {
  const auth = useAuth()
  const [tab, setTab] = useState<Tab>('auth')

  // OIDC-resolved party ID
  const [partyId, setPartyId] = useState<string | null>(null)

  // Wallet auth state
  const [walletPartyId, setWalletPartyId] = useState<string | null>(null)
  const [walletToken, setWalletToken] = useState<string | null>(null)

  const isAuthenticated = auth.isAuthenticated || !!walletPartyId
  const isAdmin = auth.isAuthenticated && !!partyId
  const effectivePartyId = partyId || walletPartyId

  // OIDC token + party resolution
  useEffect(() => {
    if (auth.user?.access_token) {
      setToken(auth.user.access_token)
      trpc.user.getPartyForUser.query()
        .then(({ partyId: p }) => setPartyId(p))
        .catch(() => setPartyId(auth.user?.profile.sub ?? null))
      const validatorUrl = import.meta.env.VITE_VALIDATOR_URL
      if (validatorUrl) {
        fetch(`${validatorUrl}/api/validator/v0/register`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${auth.user.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }).catch(() => {})
      }
    } else if (!walletToken) {
      setToken(null)
      setPartyId(null)
    }
  }, [auth.user?.access_token, walletToken])

  // Wallet token — use when OIDC is not active
  useEffect(() => {
    if (!auth.user?.access_token && walletToken) {
      setToken(walletToken)
    }
  }, [walletToken, auth.user?.access_token])

  const onWalletConnect = useCallback((pid: string, token: string) => {
    setWalletPartyId(pid)
    setWalletToken(token)
    setPartyHint(pid)
  }, [])

  const onWalletDisconnect = useCallback(() => {
    setWalletPartyId(null)
    setWalletToken(null)
    setPartyHint(null)
    if (!auth.user?.access_token) setToken(null)
  }, [auth.user?.access_token])

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-2">Canton Scaffold</h1>
      {isAuthenticated && effectivePartyId && (
        <p className="text-xs text-green-700 mb-3">
          Authenticated as: <code className="bg-gray-100 px-1 rounded">{effectivePartyId}</code>
          {walletPartyId && (
            <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-semibold">wallet</span>
          )}
          {isAdmin && (
            <span className="ml-2 px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] font-semibold">admin</span>
          )}
        </p>
      )}
      <TabBar active={tab} onChange={setTab} />
      {tab === 'auth' && (
        <AuthTab partyId={partyId} walletPartyId={walletPartyId}
          onWalletConnect={onWalletConnect} onWalletDisconnect={onWalletDisconnect} />
      )}
      {tab === 'vault' && <VaultTab walletPartyId={walletPartyId} isAdmin={isAdmin} />}
      {tab === 'admin' && <AdminTab />}
      {tab === 'pqs' && <PqsTab isAuthenticated={isAuthenticated} />}
      {tab === 'registration' && <RegistrationTab />}
      {tab === 'health' && <HealthTab />}
    </div>
  )
}
