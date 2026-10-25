// Verifica il percorso completo tra home, account globali, membri di progetto e profilo.
import { expect, test, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AppRouter from '../src/router/AppRouter'
import { AuthContext } from '../src/context/auth-context'
import { createUser, getUsers } from '../src/api/usersApi'
import { getProjectById, getProjects } from '../src/api/projectsApi'
import { addExistingUserToProject, getProjectMembers } from '../src/api/projectMembersApi'
import { getIssues } from '../src/api/issuesApi'

vi.mock('../src/api/usersApi', () => ({ createUser: vi.fn(), getUsers: vi.fn() }))
vi.mock('../src/api/projectsApi', () => ({ getProjects: vi.fn(), getProjectById: vi.fn(), createProject: vi.fn() }))
vi.mock('../src/api/projectMembersApi', () => ({ getProjectMembers: vi.fn(), addExistingUserToProject: vi.fn(), removeUserFromProject: vi.fn() }))
vi.mock('../src/api/issuesApi', () => ({ getIssues: vi.fn(), createIssue: vi.fn(), getIssueById: vi.fn(), getIssueImage: vi.fn(), updateIssueStatus: vi.fn(), updateIssueAssignee: vi.fn() }))

// Verifica che la home sia Projects e che creazione account e aggiunta al team restino due operazioni distinte.
test('creates a global account, adds it to a project and opens the current profile from the avatar', async () => {
  const admin = { id: 1, fullName: 'Original administrator', email: 'admin@example.test', role: 'ADMIN' }
  const accounts = [admin]
  const project = { id: 3, name: 'University project', description: 'Team project', memberCount: 1, totalIssues: 0, openIssues: 0, closedIssues: 0 }
  getProjects.mockResolvedValue({ items: [project] })
  getProjectById.mockResolvedValue(project)
  getIssues.mockResolvedValue({ items: [] })
  getUsers.mockImplementation(async () => ({ items: [...accounts] }))
  getProjectMembers.mockResolvedValue({ items: [{ ...admin, userId: 1, projectId: 3 }] })
  createUser.mockImplementation(async ({ fullName, email, role }) => {
    const account = { id: 2, fullName, email, role }
    accounts.push(account)
    return account
  })
  addExistingUserToProject.mockImplementation(async ({ projectId, userId }) => ({ ...accounts.find((account) => account.id === userId), userId, projectId }))

  render(<MemoryRouter initialEntries={['/dashboard']}><AuthContext.Provider value={{
    user: admin, isAuthenticated: true, isRestoringSession: false,
    notifications: { items: [], unreadCount: 0 }, refreshNotifications: vi.fn(), readNotification: vi.fn(), logout: vi.fn(),
  }}><AppRouter /></AuthContext.Provider></MemoryRouter>)

  await screen.findByRole('heading', { name: 'Projects', level: 1 })
  expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  fireEvent.click(within(screen.getByRole('navigation')).getByRole('link', { name: 'Create user' }))
  await screen.findByText('admin@example.test')
  fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'New team account' } })
  fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'new@example.test' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password123!' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
  await screen.findByText('new@example.test')
  expect(addExistingUserToProject).not.toHaveBeenCalled()

  fireEvent.click(within(screen.getByRole('navigation')).getByRole('link', { name: 'Projects' }))
  fireEvent.click(await screen.findByRole('link', { name: /University project/ }))
  await screen.findByRole('heading', { name: 'University project', level: 1 })
  fireEvent.click(screen.getByRole('link', { name: 'Project members' }))
  await screen.findByRole('option', { name: /New team account/ })
  fireEvent.change(screen.getByLabelText('User account'), { target: { value: '2' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add to project' }))
  expect(await screen.findByRole('status')).toHaveTextContent('New team account has been added')
  expect(createUser).toHaveBeenCalledOnce()
  expect(addExistingUserToProject).toHaveBeenCalledWith({ projectId: 3, userId: 2 })

  fireEvent.click(screen.getByRole('button', { name: /Original administrator\s*ADMIN/ }))
  fireEvent.click(screen.getByRole('link', { name: 'View profile' }))
  await screen.findByRole('heading', { name: 'Your profile' })
  expect(within(screen.getByRole('region', { name: 'Your account' })).getByText('admin@example.test')).toBeInTheDocument()
})
