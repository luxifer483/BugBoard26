import {
  startTransition,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { login as loginRequest } from '../api/authApi'
import { getNotifications } from '../api/notificationsApi'
import { setAuthToken } from '../api/client'
import { AuthContext } from './auth-context'

const STORAGE_KEY = 'bugboard26.session'

function readStoredSession() {
  const savedSession = window.localStorage.getItem(STORAGE_KEY)

  if (!savedSession) {
    return {
      token: '',
      user: null,
    }
  }

  try {
    return JSON.parse(savedSession)
  } catch {
    return {
      token: '',
      user: null,
    }
  }
}

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
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
      return
    }

    window.localStorage.removeItem(STORAGE_KEY)
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
