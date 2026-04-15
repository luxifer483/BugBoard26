import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLogo from '../components/AppLogo'
import { ROUTES } from '../config/routeConfig'
import { useAuth } from '../hooks/useAuth'

function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [formState, setFormState] = useState({
    email: '',
    password: '',
  })
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormState((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setIsSubmitting(true)

    try {
      await login(formState)
      navigate(ROUTES.projects)
    } catch {
      setErrorMessage('Unable to sign in. Please check your credentials and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-shell">
        <header className="login-brand">
          <AppLogo size="large" stacked showText={false} />
          <h1>BugBoard26</h1>
          <p>Bug Tracking System</p>
        </header>

        <section className="login-card" aria-label="Login form">
          <h2>Sign In</h2>

          <form className="login-form" onSubmit={handleSubmit}>
            <label className="login-field">
              <span>Email</span>
              <input
                type="email"
                name="email"
                placeholder="your.email@example.com"
                value={formState.email}
                onChange={handleChange}
                required
              />
            </label>

            <label className="login-field">
              <span>Password</span>
              <input
                type="password"
                name="password"
                placeholder="Enter your password"
                value={formState.password}
                onChange={handleChange}
                required
              />
            </label>

            <div className="login-options">
              <label className="remember-me">
                <input type="checkbox" name="rememberMe" />
                <span>Remember me</span>
              </label>

              <button className="text-button" type="button">
                Forgot password?
              </button>
            </div>

            {errorMessage ? <p className="login-error">{errorMessage}</p> : null}

            <button className="login-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Login'}
            </button>
          </form>

          <p className="login-help">
            Don&apos;t have an account? <span>Contact Administrator</span>
          </p>
        </section>

        <footer className="login-footer">
          Copyright 2026 BugBoard26. All rights reserved.
        </footer>
      </section>
    </main>
  )
}

export default LoginPage
