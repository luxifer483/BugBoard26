function RoleSelector({ value, onChange }) {
  return (
    <div className="role-selector" role="radiogroup" aria-label="User role">
      <button
        className={`role-option${value === 'User' ? ' is-selected' : ''}`}
        type="button"
        onClick={() => onChange('User')}
      >
        <span aria-hidden="true">o</span>
        User
      </button>
      <button
        className={`role-option${value === 'Admin' ? ' is-selected' : ''}`}
        type="button"
        onClick={() => onChange('Admin')}
      >
        <span aria-hidden="true">^</span>
        Admin
      </button>
    </div>
  )
}

export default RoleSelector
