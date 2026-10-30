import Icon from './Icon'
function RoleSelector({ value, onChange }) {
  return (
    <div className="role-selector" role="radiogroup" aria-label="User role">
      <button
        className={`role-option${value === 'USER' ? ' is-selected' : ''}`}
        type="button"
        onClick={() => onChange('USER')}
      >
        <Icon name="user" />
        User
      </button>
      <button
        className={`role-option${value === 'ADMIN' ? ' is-selected' : ''}`}
        type="button"
        onClick={() => onChange('ADMIN')}
      >
        <Icon name="admin" />
        Admin
      </button>
    </div>
  )
}

export default RoleSelector
