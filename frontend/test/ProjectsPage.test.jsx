import { beforeEach, afterEach, expect, test, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProjectsPage from '../src/pages/ProjectsPage'
import { AuthContext } from '../src/context/auth-context'
import { deleteProject, getProjects } from '../src/api/projectsApi'

vi.mock('../src/layouts/DashboardLayout', () => ({ default: ({ children }) => <div>{children}</div> }))
vi.mock('../src/api/projectsApi', () => ({ getProjects: vi.fn(), deleteProject: vi.fn() }))
const project = { id: 5, name: 'Sample project', description: 'Example', totalIssues: 3,
  openIssues: 2, closedIssues: 1, memberCount: 2, updatedAt: '2026-10-29T10:00:00Z' }
const refreshNotifications = vi.fn()

beforeEach(() => {
  vi.resetAllMocks()
  getProjects.mockResolvedValue({ items: [project] })
})
afterEach(() => vi.restoreAllMocks())
function show(role = 'ADMIN') {
  render(<MemoryRouter><AuthContext.Provider value={{ user: { role }, refreshNotifications }}>
    <ProjectsPage />
  </AuthContext.Provider></MemoryRouter>)
}

test('USER sees projects without a delete control', async () => {
  show('USER')
  await screen.findByRole('heading', { name: project.name })
  expect(screen.queryByRole('button', { name: /Delete project/ })).not.toBeInTheDocument()
})

test('cancelling the confirmation preserves the project and never calls the API', async () => {
  show()
  fireEvent.click(await screen.findByRole('button', { name: `Delete project ${project.name}` }))
  expect(deleteProject).not.toHaveBeenCalled()
  const dialog = screen.getByRole('alertdialog')
  expect(within(dialog).getByText(project.name)).toBeInTheDocument()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  expect(screen.getByRole('heading', { name: project.name })).toBeInTheDocument()
})

test('confirmed deletion removes the card, updates counters and refreshes notifications', async () => {
  deleteProject.mockResolvedValue(undefined)
  show()
  fireEvent.click(await screen.findByRole('button', { name: `Delete project ${project.name}` }))
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete project', exact: true }))
  await screen.findByRole('status')
  expect(deleteProject).toHaveBeenCalledWith(5)
  expect(screen.queryByRole('heading', { name: project.name })).not.toBeInTheDocument()
  expect(screen.getByText('Total Projects').nextElementSibling).toHaveTextContent('0')
  expect(refreshNotifications).toHaveBeenCalledOnce()
})

test('failed deletion keeps the project and allows retry', async () => {
  deleteProject.mockRejectedValue(new Error('Offline'))
  show()
  fireEvent.click(await screen.findByRole('button', { name: `Delete project ${project.name}` }))
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete project', exact: true }))
  await screen.findByRole('alert')
  expect(screen.getByRole('heading', { name: project.name })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: `Delete project ${project.name}` })).toBeEnabled()
})
