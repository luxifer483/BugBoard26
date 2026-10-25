// Verifica che la nuova pagina amministrativa crei il progetto e ne apra le issue.
import { expect, test, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import CreateProjectPage from '../src/pages/CreateProjectPage'
import { AuthContext } from '../src/context/auth-context'
import { createProject } from '../src/api/projectsApi'

vi.mock('../src/layouts/DashboardLayout', () => ({ default: ({ children }) => <div>{children}</div> }))
vi.mock('../src/api/projectsApi', () => ({ createProject: vi.fn() }))

// Verifica i dati inviati e la navigazione dopo una creazione riuscita.
test('creates a project from the dedicated page and opens its issue overview', async () => {
  createProject.mockResolvedValueOnce({ id: 5 })
  render(<MemoryRouter initialEntries={['/projects/new']}>
    <AuthContext.Provider value={{ user: { role: 'ADMIN' } }}>
      <Routes>
        <Route path="/projects/new" element={<CreateProjectPage />} />
        <Route path="/dashboard/:projectId" element={<p>Project issues</p>} />
      </Routes>
    </AuthContext.Provider>
  </MemoryRouter>)
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: ' New project ' } })
  fireEvent.change(screen.getByLabelText('Description'), { target: { value: ' Description ' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create project' }))
  await screen.findByText('Project issues')
  expect(createProject).toHaveBeenCalledWith({ name: 'New project', description: 'Description' })
})
