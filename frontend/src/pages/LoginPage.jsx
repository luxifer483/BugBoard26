import { useNavigate } from 'react-router-dom'
import AppLogo from '../components/AppLogo'

function LoginPage() {
  const navigate = useNavigate()

  const handleSubmit = (event) => {
    event.preventDefault()
    navigate('/projects')
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
              />
            </label>

            <label className="login-field">
              <span>Password</span>
              <input
                type="password"
                name="password"
                placeholder="Enter your password"
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

            <button className="login-submit" type="submit">
              Login
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
