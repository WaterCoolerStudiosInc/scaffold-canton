interface Props {
  result: unknown
  error: string | null
}

export function ResultBox({ result, error }: Props) {
  if (error) return <p className="mt-2 text-red-600 text-sm">{error}</p>
  if (result === null || result === undefined) return null
  return (
    <pre className="mt-3 p-3 bg-gray-50 rounded text-xs overflow-auto">
      {JSON.stringify(result, null, 2)}
    </pre>
  )
}
