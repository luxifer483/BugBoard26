import { useEffect, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { addExistingUserToProject, getProjectMembers } from '../api/projectMembersApi'
import { getProjectById } from '../api/projectsApi'
import { createUser, getUsers } from '../api/usersApi'
import UserForm from '../components/UserForm'
import UserList from '../components/UserList'
import { ROUTES } from '../config/routeConfig'
import { useAuth } from '../hooks/useAuth'
import DashboardLayout from '../layouts/DashboardLayout'

function normalizeProjectRole(role) {
  return role === 'Admin' ? 'Admin' : role || 'Developer'
}

function UserManagementPage() {
  const { projectId } = useParams()
  const { user } = useAuth()
  const [project, setProject] = useState(null)
  const [users, setUsers] = useState([])
  const [members, setMembers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadUserManagement() {
      setIsLoading(true)
      setErrorMessage('')
      setSuccessMessage('')
      setProject(null)
      setUsers([])
      setMembers([])

      try {
        const [projectResponse, usersResponse, membersResponse] = await Promise.all([
          getProjectById(projectId),
          getUsers(),
          getProjectMembers(projectId),
        ])

        if (!isMounted) {
          return
        }

        if (!projectResponse) {
          setErrorMessage('Project not found.')
          return
        }

        setProject(projectResponse)
        setUsers(usersResponse.items)
        setMembers(membersResponse.items)
      } catch {
        if (isMounted) {
          setErrorMessage('Unable to load project users right now.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadUserManagement()

    return () => {
      isMounted = false
    }
  }, [projectId])

  const hydratedMembers = useMemo(
    () =>
      members
        .map((member) => {
          const matchedUser = users.find((item) => item.id === member.userId)

          return {
            ...member,
            ...matchedUser,
            role: normalizeProjectRole(member.role),
          }
        })
        .filter((member) => member.fullName),
    [members, users],
  )

  const canManageUsers = user?.role === 'Admin'

  async function handleCreateUser(payload) {
    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const createdUser = await createUser({
        fullName: payload.fullName,
        email: payload.email,
        role: payload.role,
      })
      const newMember = await addExistingUserToProject({
        projectId: Number(projectId),
        userId: createdUser.id,
        role: payload.role === 'Admin' ? 'Admin' : 'Developer',
      })

      setUsers((currentUsers) => [...currentUsers, createdUser])
      setMembers((currentMembers) => [...currentMembers, newMember])
      setSuccessMessage(`${createdUser.fullName} has been added to ${project?.name || 'the project'}.`)
    } catch {
      setErrorMessage('Unable to create user right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleAddExistingUser(email) {
    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const existingUser = users.find(
        (item) => item.email.toLowerCase() === email.trim().toLowerCase(),
      )

      if (!existingUser) {
        setErrorMessage('No existing user was found with that email.')
        return
      }

      if (members.some((member) => member.userId === existingUser.id)) {
        setErrorMessage('That user is already a member of this project.')
        return
      }

      const newMember = await addExistingUserToProject({
        projectId: Number(projectId),
        userId: existingUser.id,
        role: existingUser.role === 'Admin' ? 'Admin' : 'Developer',
      })

      setMembers((currentMembers) => [...currentMembers, newMember])
      setSuccessMessage(`${existingUser.fullName} has been added to ${project?.name || 'the project'}.`)
    } catch {
      setErrorMessage('Unable to add user right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isLoading && !canManageUsers) {
    return <Navigate to={ROUTES.projects} replace />
  }

  return (
    <DashboardLayout projectId={projectId}>
      <main className="user-management-page">
        <header className="user-management-header">
          <h1>User Management</h1>
          <p>
            {project
              ? `Manage members and permissions for ${project.name}`
              : 'Manage project members and permissions'}
          </p>
        </header>

        {isLoading ? <p className="status-message">Loading user management...</p> : null}
        {errorMessage ? <p className="status-message is-error">{errorMessage}</p> : null}
        {successMessage ? <p className="status-message is-success">{successMessage}</p> : null}

        {!isLoading && !errorMessage ? (
          <div className="user-management-grid">
            <UserList members={hydratedMembers} />
            <UserForm
              onCreateUser={handleCreateUser}
              onAddExistingUser={handleAddExistingUser}
              isSubmitting={isSubmitting}
            />
          </div>
        ) : null}
      </main>
    </DashboardLayout>
  )
}

export default UserManagementPage
