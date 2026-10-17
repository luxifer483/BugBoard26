import { useState } from 'react'
import RoleSelector from './RoleSelector'

function UserForm({ onCreateUser, onAddExistingUser, isSubmitting }) {
  const [newUser, setNewUser] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'USER',
  })
  const [existingEmail, setExistingEmail] = useState('')

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

  async function handleAddExistingUser(event) {
    event.preventDefault()
    if (!await onAddExistingUser(existingEmail)) return
    setExistingEmail('')
  }

  return (
    <aside className="user-management-forms">
      <section className="user-form-card" aria-label="Create new user">
        <h2>Create New User</h2>

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
            + Create User
          </button>
        </form>
      </section>

      <section className="user-form-card" aria-label="Add existing user">
        <h2>Add Existing User</h2>
        <p>Add an existing user to this project</p>

        <form className="user-form" onSubmit={handleAddExistingUser}>
          <label>
            <span>User Email</span>
            <input
              type="email"
              placeholder="user@example.com"
              value={existingEmail}
              onChange={(event) => setExistingEmail(event.target.value)}
              required
            />
          </label>
          <button className="user-form-submit is-green" type="submit" disabled={isSubmitting}>
            + Add User
          </button>
        </form>
      </section>
    </aside>
  )
}

export default UserForm
