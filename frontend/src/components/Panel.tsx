interface Props {
  title: string
  children: React.ReactNode
}

export function Panel({ title, children }: Props) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 mb-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      {children}
    </div>
  )
}
