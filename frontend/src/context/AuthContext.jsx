import {
  startTransition,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { login as loginRequest } from '../api/authApi'
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
  const [notifications, setNotifications] = useState({
    items: [],
    unreadCount: 0,
  })
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false)

  useEffect(() => {
    setAuthToken(session.token)

    if (session.token && session.user) {
      writeStoredSession(session)
      return
    }

    clearStoredSession()
  }, [session])

  useEffect(() => {
    if (!session.token) {
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

    startTransition(() => {
      setSession({
        token: response.token,
        user: response.user,
      })
    })

    return response
  }

  function logout() {
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
      notifications,
      isLoadingNotifications,
      login,
      logout,
    }),
    [session, notifications, isLoadingNotifications],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
