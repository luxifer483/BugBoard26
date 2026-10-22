import { expect, test, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Topbar from '../src/components/Topbar'
import { AuthContext } from '../src/context/auth-context'

function openProfile() {
  const logout = vi.fn()
  render(<MemoryRouter><AuthContext.Provider value={{
    user: { fullName: 'Test User', role: 'USER' }, notifications: { items: [], unreadCount: 0 },
    logout, refreshNotifications: vi.fn(), readNotification: vi.fn(),
  }}><Topbar /></AuthContext.Provider></MemoryRouter>)
  const trigger = screen.getByRole('button', { name: /Test User\s*USER/ })
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
