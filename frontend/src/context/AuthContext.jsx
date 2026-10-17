import {
  startTransition,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { getCurrentUser, login as loginRequest } from '../api/authApi'
import { USE_MOCK_API } from '../config/apiConfig'
import { getNotifications } from '../api/notificationsApi'
import {
  clearStoredSession,
  readStoredSession,
  writeStoredSession,
} from '../security/authStorage'
import { setAuthToken } from '../security/tokenManager'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readStoredSession)
  const [isRestoringSession, setIsRestoringSession] = useState(
    () => !USE_MOCK_API && Boolean(readStoredSession().token),
  )
  const [notifications, setNotifications] = useState({
    items: [],
    unreadCount: 0,
  })
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false)

  useEffect(() => {
    function handleSessionExpired() {
      setAuthToken('')
      startTransition(() => {
        setSession({ token: '', user: null })
        setIsRestoringSession(false)
      })
    }
    window.addEventListener('bugboard26:session-expired', handleSessionExpired)
    return () => window.removeEventListener('bugboard26:session-expired', handleSessionExpired)
  }, [])

  useEffect(() => {
    const stored = readStoredSession()
    if (!stored.token || USE_MOCK_API) {
      return undefined
    }
    let active = true
    getCurrentUser()
      .then((user) => {
        if (active && readStoredSession().token === stored.token) {
          const restored = { ...stored, user }
          writeStoredSession(restored)
          startTransition(() => setSession(restored))
        }
      })
      .catch(() => {
        if (active && readStoredSession().token === stored.token) {
          clearStoredSession()
          setAuthToken('')
          startTransition(() => setSession({ token: '', user: null }))
        }
      })
      .finally(() => {
        if (active) setIsRestoringSession(false)
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!session.token || !USE_MOCK_API) {
      startTransition(() => {
        setNotifications({
          items: [],
          unreadCount: 0,
        })
      })
      return
    }

    let isMounted = true

    async function loadNotifications() {
      setIsLoadingNotifications(true)

      try {
        const response = await getNotifications()

        if (!isMounted) {
          return
        }

        startTransition(() => {
          setNotifications(response)
        })
      } catch {
        if (isMounted) setNotifications({ items: [], unreadCount: 0 })
      } finally {
        if (isMounted) {
          setIsLoadingNotifications(false)
        }
      }
    }

    loadNotifications()

    return () => {
      isMounted = false
    }
  }, [session.token])

  async function login(credentials) {
    const response = await loginRequest(credentials)
    const nextSession = { token: response.token, user: response.user }
    writeStoredSession(nextSession)
    setAuthToken(response.token)

    startTransition(() => {
      setSession({
        token: response.token,
        user: response.user,
      })
    })

    return response
  }

  function logout() {
    clearStoredSession()
    setAuthToken('')
    startTransition(() => {
      setSession({
        token: '',
        user: null,
      })
      setNotifications({
        items: [],
        unreadCount: 0,
      })
    })
  }

  const value = useMemo(
    () => ({
      token: session.token,
      user: session.user,
      isAuthenticated: Boolean(session.token),
      isRestoringSession,
      notifications,
      isLoadingNotifications,
      login,
      logout,
    }),
    [session, notifications, isLoadingNotifications, isRestoringSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
