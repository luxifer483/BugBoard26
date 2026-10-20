const STATUS_OPTIONS = [
  { value: 'TODO', label: 'To do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'CLOSED', label: 'Closed' },
]

function StatusDropdown({ value, onChange, disabled = false }) {
  return (
    <label className="status-dropdown">
      <span>Change Status</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}
            disabled={option.value !== value && !(
              (value === 'TODO' && option.value === 'IN_PROGRESS') ||
              (value === 'IN_PROGRESS' && option.value === 'CLOSED')
            )}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export default StatusDropdown
