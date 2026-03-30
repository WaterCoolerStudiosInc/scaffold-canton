interface Props {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}

export function Field({ label, value, onChange, placeholder, type = 'text' }: Props) {
  return (
    <label className="flex flex-col gap-1 text-xs text-gray-600">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border rounded px-2 py-1.5 text-sm text-gray-900"
      />
    </label>
  )
}
