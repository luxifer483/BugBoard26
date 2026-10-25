// Verifica che la creazione di account sia globale e separata dalle appartenenze ai progetti.
import { beforeEach, expect, test, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import UsersPage from '../src/pages/UsersPage'
import { AuthContext } from '../src/context/auth-context'
import { createUser, getUsers } from '../src/api/usersApi'
import { addExistingUserToProject } from '../src/api/projectMembersApi'

vi.mock('../src/layouts/DashboardLayout', () => ({ default: ({ children }) => <div>{children}</div> }))
vi.mock('../src/api/usersApi', () => ({ createUser: vi.fn(), getUsers: vi.fn() }))
vi.mock('../src/api/projectMembersApi', () => ({ addExistingUserToProject: vi.fn() }))

beforeEach(() => {
  getUsers.mockResolvedValue({ items: [{ id: 1, fullName: 'Existing account', email: 'existing@example.test', role: 'ADMIN' }] })
})

// Apre la gestione globale con il modulo di creazione richiesto dalla navbar.
function openPage(role = 'ADMIN') {
  render(<MemoryRouter initialEntries={['/users?create=1']}>
    <AuthContext.Provider value={{ user: { id: 1, role } }}>
      <Routes>
        <Route path="/users" element={<UsersPage />} />
        <Route path="/projects" element={<p>Projects home</p>} />
      </Routes>
    </AuthContext.Provider>
  </MemoryRouter>)
}

// Verifica che sia USER sia ADMIN vengano creati come account, senza aggiunta automatica a progetti.
test.each(['USER', 'ADMIN'])('creates a global %s account without creating a membership', async (role) => {
  createUser.mockResolvedValueOnce({ id: 2, fullName: 'New account', email: 'new@example.test', role })
  openPage()
  await screen.findByText('existing@example.test')
  fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'New account' } })
  fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'new@example.test' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password123!' } })
  if (role === 'ADMIN') fireEvent.click(screen.getByRole('button', { name: 'Admin' }))
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
  await screen.findByText('new@example.test')
  expect(createUser).toHaveBeenCalledWith({ fullName: 'New account', email: 'new@example.test', password: 'Password123!', role })
  expect(addExistingUserToProject).not.toHaveBeenCalled()
  expect(screen.queryByRole('form', { name: 'Add existing user' })).not.toBeInTheDocument()
  expect(within(screen.getByRole('region', { name: 'All accounts' })).queryByRole('button')).not.toBeInTheDocument()
})

// Verifica che un errore del backend mantenga i dati inseriti nel modulo.
test('preserves the account draft after a rejected creation', async () => {
  createUser.mockRejectedValueOnce({ response: { data: { message: 'Email already exists.' } } })
  openPage()
  await screen.findByText('existing@example.test')
  fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'New account' } })
  fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'existing@example.test' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password123!' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Email already exists.')
  expect(screen.getByLabelText('Full Name')).toHaveValue('New account')
})

// Verifica che un utente normale non possa aprire la gestione globale ne leggere gli account.
test('redirects normal users without loading the account list', async () => {
  openPage('USER')
  await screen.findByText('Projects home')
  expect(getUsers).not.toHaveBeenCalled()
})
