import { useAuth } from 'react-oidc-context'
import { Panel } from '../components/Panel'

interface Props {
  partyId: string | null
}

export function AuthTab({ partyId }: Props) {
  const auth = useAuth()

  if (auth.isLoading) {
    return <Panel title="Auth">Loading...</Panel>
  }

  if (auth.error) {
    return (
      <Panel title="Auth — Error">
        <p className="text-red-600 text-sm">{auth.error.message}</p>
        <button
          onClick={() => auth.signinRedirect()}
          className="mt-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded"
        >
          Retry Login
        </button>
      </Panel>
    )
  }

  if (auth.isAuthenticated) {
    return (
      <Panel title="Auth — Logged In">
        <p className="text-sm text-green-700 mb-1">
          Party ID: <code className="bg-gray-100 px-1 rounded">{partyId ?? '…'}</code>
        </p>
        <button
          onClick={() => auth.signoutRedirect()}
          className="mt-2 px-3 py-1.5 bg-red-600 text-white text-sm rounded"
        >
          Logout
        </button>
        <details className="mt-3">
          <summary className="text-xs text-gray-500 cursor-pointer">Show access token</summary>
          <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-auto break-all whitespace-pre-wrap">
            {auth.user?.access_token}
          </pre>
        </details>
      </Panel>
    )
  }

  return (
    <Panel title="Auth — Login">
      <p className="text-sm text-gray-500 mb-3">
        Sign in with your Canton validator account via Keycloak.
      </p>
      <button
        onClick={() => auth.signinRedirect()}
        className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
      >
        Login with Keycloak
      </button>
    </Panel>
  )
}
