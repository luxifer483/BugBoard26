import { expect, test, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Topbar from '../src/components/Topbar'
import { AuthContext } from '../src/context/auth-context'

function openProfile(role = 'USER') {
  const logout = vi.fn()
  render(<MemoryRouter><AuthContext.Provider value={{
    user: { fullName: 'Test User', role }, notifications: { items: [], unreadCount: 0 },
    logout, refreshNotifications: vi.fn(), readNotification: vi.fn(),
  }}><Topbar /></AuthContext.Provider></MemoryRouter>)
  const trigger = screen.getByRole('button', { name: new RegExp(`Test User\\s*${role}`) })
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
  fireEvent.click(trigger)
  return { trigger, logout }
}

test('profile is a labelled disclosure with native links and buttons', () => {
  const { trigger } = openProfile()
  const panel = screen.getByRole('region', { name: 'Profile menu' })
  expect(trigger).toHaveAttribute('aria-controls', panel.id)
  expect(trigger).toHaveAttribute('aria-expanded', 'true')
  expect(trigger).not.toHaveAttribute('aria-haspopup')
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  expect(within(panel).getByRole('link', { name: 'View profile' })).toBeInTheDocument()
  expect(within(panel).getByRole('button', { name: 'Logout' })).toBeInTheDocument()
})

test('Escape closes the profile and restores focus to its trigger', () => {
  const { trigger } = openProfile()
  screen.getByRole('link', { name: 'View profile' }).focus()
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByRole('region', { name: 'Profile menu' })).not.toBeInTheDocument()
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
  expect(trigger).toHaveFocus()
})

test('logout closes the profile and invokes the session action', () => {
  const { logout } = openProfile()
  fireEvent.click(screen.getByRole('button', { name: 'Logout' }))
  expect(logout).toHaveBeenCalledOnce()
  expect(screen.queryByRole('region', { name: 'Profile menu' })).not.toBeInTheDocument()
})

// Verifica le voci della barra per entrambi i ruoli, senza ricerca, dashboard o link pubblico al profilo.
test.each(['ADMIN', 'USER'])('shows the appropriate horizontal navigation for %s', (role) => {
  openProfile(role)
  const navigation = screen.getByRole('navigation', { name: 'Primary navigation' })
  expect(within(navigation).getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/projects')
  expect(within(navigation).getByRole('button', { name: 'Notifications' })).toBeInTheDocument()
  expect(within(navigation).queryByRole('link', { name: /Dashboard|Profile/ })).not.toBeInTheDocument()
  expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  if (role === 'ADMIN') {
    expect(within(navigation).getByRole('link', { name: 'Create user' })).toHaveAttribute('href', '/users?create=1')
    expect(within(navigation).getByRole('link', { name: 'Create project' })).toHaveAttribute('href', '/projects/new')
  } else {
    expect(within(navigation).queryByRole('link', { name: 'Create user' })).not.toBeInTheDocument()
    expect(within(navigation).queryByRole('link', { name: 'Users' })).not.toBeInTheDocument()
    expect(within(navigation).queryByRole('link', { name: 'Create project' })).not.toBeInTheDocument()
  }
})

// La notifica mostra il titolo della issue insieme al messaggio e al collegamento esistente.
test('notifications display the issue title and keep the issue link', () => {
  render(<MemoryRouter><AuthContext.Provider value={{
    user: { fullName: 'Test User', role: 'USER' },
    notifications: { items: [{ id: 4, issueId: 12, issueTitle: 'Login button on mobile',
      message: 'Issue BUG-26-12 has been assigned to you', read: false, createdAt: '2026-10-26T12:00:00Z' }], unreadCount: 1 },
    refreshNotifications: vi.fn(), readNotification: vi.fn(), logout: vi.fn(),
  }}><Topbar /></AuthContext.Provider></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'Notifications' }))
  const panel = within(screen.getByRole('dialog', { name: 'Notifications panel' }))
  expect(panel.getByText('Login button on mobile')).toBeInTheDocument()
  expect(panel.getByText('Issue BUG-26-12 has been assigned to you')).toBeInTheDocument()
  expect(panel.getByRole('link')).toHaveAttribute('href', '/issues/12')
})
