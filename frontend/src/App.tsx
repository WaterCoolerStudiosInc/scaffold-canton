import { useState, useEffect } from 'react'
import { useAuth } from 'react-oidc-context'
import { TabBar } from './components/TabBar'
import { HealthTab } from './tabs/HealthTab'
import { AuthTab } from './tabs/AuthTab'
import { RegistrationTab } from './tabs/RegistrationTab'
import { AdminTab } from './tabs/AdminTab'
import { UserTab } from './tabs/UserTab'
import { setToken, trpc } from './trpc'

type Tab = 'health' | 'auth' | 'registration' | 'admin' | 'user'

export default function App() {
  const auth = useAuth()
  const [tab, setTab] = useState<Tab>('health')
  const [partyId, setPartyId] = useState<string | null>(null)

  useEffect(() => {
    if (auth.user?.access_token) {
      setToken(auth.user.access_token)
      trpc.whoami.query()
        .then(({ partyId: p }) => setPartyId(p))
        .catch(() => setPartyId(auth.user?.profile.preferred_username ?? auth.user?.profile.sub ?? null))
      const validatorUrl = import.meta.env.VITE_VALIDATOR_URL
      if (validatorUrl) {
        fetch(`${validatorUrl}/api/validator/v0/register`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${auth.user.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }).catch(() => {/* ignore — already onboarded or validator unreachable */})
      }
    } else {
      setToken(null)
      setPartyId(null)
    }
  }, [auth.user?.access_token])

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-2">Canton Scaffold — Test Dashboard</h1>
      {auth.isAuthenticated && partyId && (
        <p className="text-xs text-green-700 mb-3">
          Authenticated as: <code className="bg-gray-100 px-1 rounded">{partyId}</code>
        </p>
      )}
      <TabBar active={tab} onChange={setTab} />
      {tab === 'health' && <HealthTab />}
      {tab === 'auth' && <AuthTab partyId={partyId} />}
      {tab === 'registration' && <RegistrationTab />}
      {tab === 'admin' && <AdminTab />}
      {tab === 'user' && <UserTab isAuthenticated={auth.isAuthenticated} />}
    </div>
  )
}
