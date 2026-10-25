import { useState } from 'react'
import RoleSelector from './RoleSelector'

// Raccoglie i dati di un account globale; qui non viene scelta alcuna appartenenza a progetti.
function UserForm({ onCreateUser, onCancel, isSubmitting }) {
  const [newUser, setNewUser] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'USER',
  })

  function handleNewUserChange(event) {
    const { name, value } = event.target

    setNewUser((currentUser) => ({
      ...currentUser,
      [name]: value,
    }))
  }

  async function handleCreateUser(event) {
    event.preventDefault()
    if (!await onCreateUser(newUser)) return
    setNewUser({
      fullName: '',
      email: '',
      password: '',
      role: 'USER',
    })
  }

  return (
    <aside className="user-management-forms">
      <section className="user-form-card" aria-label="Create new user">
        <h2>Create account</h2>
        <p>Choose a User or Admin account.</p>

        <form className="user-form" onSubmit={handleCreateUser}>
          <label>
            <span>Full Name</span>
            <input
              name="fullName"
              maxLength={120}
              placeholder="John Doe"
              value={newUser.fullName}
              onChange={handleNewUserChange}
              required
            />
          </label>
          <label>
            <span>Email Address</span>
            <input
              name="email"
              maxLength={254}
              type="email"
              placeholder="john@example.com"
              value={newUser.email}
              onChange={handleNewUserChange}
              required
            />
          </label>
          <label>
            <span>Password</span>
            <input
              name="password"
              minLength={8}
              maxLength={72}
              type="password"
              placeholder="********"
              value={newUser.password}
              onChange={handleNewUserChange}
              required
            />
          </label>

          <div className="user-form-group">
            <span>User Role</span>
            <RoleSelector
              value={newUser.role}
              onChange={(role) =>
                setNewUser((currentUser) => ({
                  ...currentUser,
                  role,
                }))
              }
            />
          </div>

          <button className="user-form-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create account'}
          </button>
        </form>
      </section>

      {onCancel ? <button className="secondary-button" type="button" onClick={onCancel} disabled={isSubmitting}>Cancel</button> : null}
    </aside>
  )
}

export default UserForm
