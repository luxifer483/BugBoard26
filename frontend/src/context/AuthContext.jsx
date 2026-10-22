import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { getCurrentUser, login as loginRequest } from '../api/authApi'
import { USE_MOCK_API } from '../config/apiConfig'
import { getNotifications, markNotificationRead } from '../api/notificationsApi'
import {
  clearStoredSession,
  readStoredSession,
  writeStoredSession,
} from '../security/authStorage'
import { setAuthToken } from '../security/tokenManager'
import { AuthContext } from './auth-context'

// Accesso automatico facoltativo, disponibile soltanto durante le prove con Vite.
const DEV_AUTO_LOGIN = import.meta.env.DEV && import.meta.env.VITE_DEV_AUTO_LOGIN === 'true'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readStoredSession)
  const [isRestoringSession, setIsRestoringSession] = useState(
    () => !USE_MOCK_API && (Boolean(readStoredSession().token) || DEV_AUTO_LOGIN),
  )
  const [notifications, setNotifications] = useState({
    items: [],
    unreadCount: 0,
  })
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false)
  const [notificationsError, setNotificationsError] = useState('')

  const refreshNotifications = useCallback(() => {
    window.dispatchEvent(new Event('bugboard26:refresh-notifications'))
  }, [])

  const readNotification = useCallback(async (id) => {
    try {
      await markNotificationRead(id)
      refreshNotifications()
      return true
    } catch {
      setNotificationsError('Unable to mark the notification as read. Try again.')
      return false
    }
  }, [refreshNotifications])

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
    if ((!stored.token && !DEV_AUTO_LOGIN) || USE_MOCK_API) {
      return undefined
    }
    let active = true
    const restore = stored.token
      ? getCurrentUser().then((user) => ({ ...stored, user }))
      : import.meta.env.DEV
        ? loginRequest({
            email: import.meta.env.VITE_DEV_LOGIN_EMAIL,
            password: import.meta.env.VITE_DEV_LOGIN_PASSWORD,
          }).then(({ token, user }) => ({ token, user }))
        : Promise.reject(new Error('No stored session'))

    restore
      .then((restored) => {
        if (active && readStoredSession().token === stored.token) {
          writeStoredSession(restored)
          setAuthToken(restored.token)
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
    if (!session.token) {
      startTransition(() => {
        setIsLoadingNotifications(false)
        setNotificationsError('')
        setNotifications({
          items: [],
          unreadCount: 0,
        })
      })
      return
    }

    let isMounted = true
    let requestNumber = 0

    async function loadNotifications() {
      const request = ++requestNumber
      setIsLoadingNotifications(true)

      try {
        const response = await getNotifications()

        if (!isMounted || request !== requestNumber) {
          return
        }

        startTransition(() => {
          setNotifications(response)
          setNotificationsError('')
        })
      } catch {
        if (isMounted && request === requestNumber) {
          setNotificationsError('Unable to load notifications. Try again.')
        }
      } finally {
        if (isMounted && request === requestNumber) {
          setIsLoadingNotifications(false)
        }
      }
    }

    void loadNotifications()
    const interval = window.setInterval(loadNotifications, 30000)
    window.addEventListener('bugboard26:refresh-notifications', loadNotifications)

    return () => {
      isMounted = false
      window.clearInterval(interval)
      window.removeEventListener('bugboard26:refresh-notifications', loadNotifications)
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
      notificationsError,
      refreshNotifications,
      readNotification,
      login,
      logout,
    }),
    [session, notifications, isLoadingNotifications, isRestoringSession,
      notificationsError, refreshNotifications, readNotification],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
