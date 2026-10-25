// Verifica la sessione e il token usando i componenti e il client HTTP dell'applicazione.
import { AxiosError } from 'axios'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import apiClient from '../src/api/client'
import { getProjects } from '../src/api/projectsApi'
import { useAuth } from '../src/hooks/useAuth'
import { clearStoredSession, readStoredSession, writeStoredSession } from '../src/security/authStorage'

const user = { id: 1, name: 'Test User', email: 'test@example.com', role: 'USER' }
const session = { token: 'test-session-token', user }
const originalAdapter = apiClient.defaults.adapter
let AuthProvider
let requests
let expireProjects

// Mostra l'esito dell'autenticazione e permette di esercitare login e logout.
function SessionControls() {
  const auth = useAuth()
  return <>
    <span>{auth.isRestoringSession ? 'Restoring' : auth.isAuthenticated ? auth.user.email : 'Logged out'}</span>
    <button onClick={() => auth.login({ email: user.email, password: 'TestPassword123!' })}>Login</button>
    <button onClick={auth.logout}>Logout</button>
  </>
}

beforeEach(async () => {
  vi.stubEnv('VITE_DEV_AUTO_LOGIN', 'false')
  ;({ AuthProvider } = await import('../src/context/AuthContext'))
  clearStoredSession()
  requests = []
  expireProjects = false
  // Sostituisce soltanto il trasporto HTTP del test, conservando gli interceptor reali.
  apiClient.defaults.adapter = async (config) => {
    requests.push({ url: config.url, authorization: config.headers.get('Authorization') })
    if (config.url === '/projects' && expireProjects) {
      throw new AxiosError('Session expired', 'ERR_BAD_REQUEST', config, null, {
        data: { code: 'UNAUTHORIZED' }, status: 401, statusText: 'Unauthorized', headers: {}, config,
      })
    }
    const responses = {
      '/auth/login': session,
      '/users/me': user,
      '/projects': { items: [], totalCount: 0 },
      '/notifications': { items: [], totalCount: 0, unreadCount: 0 },
    }
    if (!(config.url in responses)) throw new Error(`Unexpected request: ${config.url}`)
    return { data: responses[config.url], status: 200, statusText: 'OK', headers: {}, config }
  }
})

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
  clearStoredSession()
  vi.unstubAllEnvs()
})

// Il login salva la sessione; le richieste usano il token fino al logout, che lo rimuove.
test('login and logout update the token used by subsequent API requests', async () => {
  render(<AuthProvider><SessionControls /></AuthProvider>)
  expect(screen.getByText('Logged out')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Login' }))
  await screen.findByText(user.email)
  expect(readStoredSession()).toEqual(session)
  expect(requests.find(({ url }) => url === '/auth/login').authorization).toBeUndefined()
  await getProjects()
  expect(requests.at(-1)).toEqual({ url: '/projects', authorization: `Bearer ${session.token}` })
  fireEvent.click(screen.getByRole('button', { name: 'Logout' }))
  await screen.findByText('Logged out')
  expect(readStoredSession().token).toBe('')
  await getProjects()
  expect(requests.at(-1)).toEqual({ url: '/projects', authorization: undefined })
})

// Il ricaricamento verifica la sessione col server; un errore 401 elimina sessione e token.
test('restores a saved session and clears authentication when the backend returns 401', async () => {
  writeStoredSession(session)
  render(<AuthProvider><SessionControls /></AuthProvider>)
  await screen.findByText(user.email)
  expect(requests.find(({ url }) => url === '/users/me').authorization).toBe(`Bearer ${session.token}`)
  expireProjects = true
  await act(async () => {
    await expect(getProjects()).rejects.toMatchObject({ response: { status: 401 } })
  })
  await waitFor(() => expect(screen.getByText('Logged out')).toBeInTheDocument())
  expect(readStoredSession()).toEqual({ token: '', user: null })
  expireProjects = false
  await getProjects()
  expect(requests.at(-1)).toEqual({ url: '/projects', authorization: undefined })
})
