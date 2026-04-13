export type Tab = 'auth' | 'vault' | 'admin' | 'pqs' | 'registration' | 'health'

interface Props {
  active: Tab
  onChange: (tab: Tab) => void
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'auth', label: 'Auth' },
  { id: 'vault', label: 'Vault' },
  { id: 'admin', label: 'Admin' },
  { id: 'pqs', label: 'PQS' },
  { id: 'registration', label: 'Registration' },
  { id: 'health', label: 'Health' },
]

export function TabBar({ active, onChange }: Props) {
  return (
    <div className="flex border-b border-gray-200 mb-6">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            active === tab.id
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
