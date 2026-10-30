// Verifica che la pagina del progetto mostri le azioni consentite dal ruolo globale.
import { expect, test, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthContext } from '../src/context/auth-context'
import DashboardPage from '../src/pages/DashboardPage'
import { deleteProject, getProjectById } from '../src/api/projectsApi'
import { getIssues } from '../src/api/issuesApi'

vi.mock('../src/layouts/DashboardLayout', () => ({ default: ({ children }) => <div>{children}</div> }))
vi.mock('../src/api/projectsApi', () => ({ getProjectById: vi.fn(), deleteProject: vi.fn() }))
vi.mock('../src/api/issuesApi', () => ({ getIssues: vi.fn() }))

// Verifica che entrambi i ruoli possano creare issue e che solo ADMIN acceda alla gestione membri.
test.each(['USER', 'ADMIN'])('%s sees the permitted project actions', async (role) => {
  getProjectById.mockResolvedValue({ id: 3, name: 'Shared project' })
  getIssues.mockResolvedValue({ items: [] })
  render(<MemoryRouter initialEntries={['/dashboard/3']}><AuthContext.Provider value={{ user: { id: 7, role } }}>
    <Routes><Route path="/dashboard/:projectId" element={<DashboardPage />} /></Routes>
  </AuthContext.Provider></MemoryRouter>)
  await screen.findByRole('heading', { name: 'Shared project' })
  expect(screen.getByRole('link', { name: 'Create issue' })).toBeInTheDocument()
  expect(Boolean(screen.queryByRole('link', { name: 'Project members' }))).toBe(role === 'ADMIN')
  expect(Boolean(screen.queryByRole('button', { name: 'Delete project' }))).toBe(role === 'ADMIN')
})

test('dashboard deletion requires confirmation and returns to projects after success', async () => {
  getProjectById.mockResolvedValue({ id: 3, name: 'Shared project' })
  getIssues.mockResolvedValue({ items: [] })
  deleteProject.mockResolvedValue(undefined)
  render(<MemoryRouter initialEntries={['/dashboard/3']}><AuthContext.Provider value={{ user: { role: 'ADMIN' } }}>
    <Routes><Route path="/dashboard/:projectId" element={<DashboardPage />} />
      <Route path="/projects" element={<h1>All projects</h1>} /></Routes>
  </AuthContext.Provider></MemoryRouter>)
  fireEvent.click(await screen.findByRole('button', { name: 'Delete project' }))
  expect(deleteProject).not.toHaveBeenCalled()
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete project', exact: true }))
  await screen.findByRole('heading', { name: 'All projects' })
  expect(deleteProject).toHaveBeenCalledWith(3)
})
