// Verifica la gestione delle membership separatamente dalla creazione degli account.
import { beforeEach, expect, test, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ProjectMembersPage from '../src/pages/ProjectMembersPage'
import { AuthContext } from '../src/context/auth-context'
import { getUsers, createUser } from '../src/api/usersApi'
import { getProjectById } from '../src/api/projectsApi'
import { addExistingUserToProject, getProjectMembers, removeUserFromProject } from '../src/api/projectMembersApi'

vi.mock('../src/layouts/DashboardLayout', () => ({ default: ({ children }) => <div>{children}</div> }))
vi.mock('../src/api/usersApi', () => ({ getUsers: vi.fn(), createUser: vi.fn() }))
vi.mock('../src/api/projectsApi', () => ({ getProjectById: vi.fn() }))
vi.mock('../src/api/projectMembersApi', () => ({ getProjectMembers: vi.fn(), addExistingUserToProject: vi.fn(), removeUserFromProject: vi.fn() }))

const admin = { id: 1, fullName: 'Administrator', email: 'admin@example.test', role: 'ADMIN' }
const candidate = { id: 2, fullName: 'Registered user', email: 'member@example.test', role: 'USER' }

beforeEach(() => {
  getUsers.mockResolvedValue({ items: [admin, candidate] })
  getProjectById.mockResolvedValue({ id: 3, name: 'University project' })
  getProjectMembers.mockResolvedValue({ items: [{ ...admin, userId: 1, projectId: 3 }] })
})

// Apre la gestione dei membri del progetto con una sessione amministratore.
function openPage() {
  render(<MemoryRouter initialEntries={['/projects/3/members']}>
    <AuthContext.Provider value={{ user: admin }}>
      <Routes><Route path="/projects/:projectId/members" element={<ProjectMembersPage />} /></Routes>
    </AuthContext.Provider>
  </MemoryRouter>)
}

// Verifica che si possano selezionare soltanto account non membri e che venga salvata solo la membership.
test('adds an existing account without creating another user', async () => {
  addExistingUserToProject.mockResolvedValueOnce({ ...candidate, projectId: 3, userId: 2 })
  openPage()
  const option = await screen.findByRole('option', { name: /Registered user/ })
  expect(option).toHaveValue('2')
  expect(screen.queryByRole('option', { name: /Administrator/ })).not.toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('User account'), { target: { value: '2' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add to project' }))
  expect(await screen.findByRole('status')).toHaveTextContent('Registered user has been added')
  expect(addExistingUserToProject).toHaveBeenCalledWith({ projectId: 3, userId: 2 })
  expect(createUser).not.toHaveBeenCalled()
  expect(screen.queryByRole('option', { name: /Registered user/ })).not.toBeInTheDocument()
})

// Verifica che un amministratore possa uscire dal team mantenendo disponibile il proprio account globale.
test('removes only the membership and makes the account available for re-adding', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  removeUserFromProject.mockResolvedValueOnce(undefined)
  openPage()
  await screen.findByRole('option', { name: /Registered user/ })
  const team = screen.getByRole('region', { name: 'Project members' })
  fireEvent.click(within(team).getByRole('button', { name: 'Remove from project' }))
  expect(await screen.findByRole('status')).toHaveTextContent('Administrator has been removed')
  expect(removeUserFromProject).toHaveBeenCalledWith({ projectId: 3, userId: 1 })
  expect(await screen.findByRole('option', { name: /Administrator/ })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Project members', level: 1 })).toBeInTheDocument()
})
