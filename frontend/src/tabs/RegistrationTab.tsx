import { useState } from 'react'
import { trpc } from '../trpc'
import { Panel } from '../components/Panel'
import { ResultBox } from '../components/ResultBox'

export function RegistrationTab() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<unknown>(null)
  const [error, setError] = useState<string | null>(null)

  async function register() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await trpc.registration.register.mutate({ username, password })
      setResult(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Panel title="Registration — Register User">
      <div className="flex flex-col gap-2 max-w-sm">
        <input
          type="text"
          placeholder="Username (lowercase, alphanumeric, hyphens)"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="border rounded px-2 py-1.5 text-sm"
        />
        <input
          type="password"
          placeholder="Password (min 8 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border rounded px-2 py-1.5 text-sm"
        />
        <button
          onClick={register}
          disabled={loading || !username || !password}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded disabled:opacity-50"
        >
          {loading ? 'Registering…' : 'Register'}
        </button>
      </div>
      <ResultBox result={result} error={error} />
    </Panel>
  )
}
