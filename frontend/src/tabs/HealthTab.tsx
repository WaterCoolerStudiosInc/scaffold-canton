import { useState } from 'react'
import { trpc } from '../trpc'
import { Panel } from '../components/Panel'

export function HealthTab() {
  const [result, setResult] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function ping() {
    setLoading(true)
    setError(null)
    try {
      const res = await trpc.health.query()
      setResult(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Panel title="Health Check">
      <button
        onClick={ping}
        disabled={loading}
        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded disabled:opacity-50"
      >
        {loading ? 'Pinging…' : 'Ping'}
      </button>
      {error && <p className="mt-2 text-red-600 text-sm">{error}</p>}
      {result !== null && (
        <pre className="mt-3 p-3 bg-gray-50 rounded text-xs overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </Panel>
  )
}
