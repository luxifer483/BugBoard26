function RoleSelector({ value, onChange }) {
  return (
    <div className="role-selector" role="radiogroup" aria-label="User role">
      <button
        className={`role-option${value === 'USER' ? ' is-selected' : ''}`}
        type="button"
        onClick={() => onChange('USER')}
      >
        <span aria-hidden="true">o</span>
        User
      </button>
      <button
        className={`role-option${value === 'ADMIN' ? ' is-selected' : ''}`}
        type="button"
        onClick={() => onChange('ADMIN')}
      >
        <span aria-hidden="true">^</span>
        Admin
      </button>
    </div>
  )
}

export default RoleSelector
