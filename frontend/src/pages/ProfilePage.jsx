// Mostra i dati dell'account autenticato; il profilo si apre dal menu in alto a destra.
import { Link } from 'react-router-dom'
import { ROUTES } from '../config/routeConfig'
import { useAuth } from '../hooks/useAuth'
import DashboardLayout from '../layouts/DashboardLayout'
import { getInitials } from '../utils/formatters'

function ProfilePage() {
  const { user } = useAuth()

  return (
    <DashboardLayout>
      <main className="profile-page">
        <header className="page-heading">
          <div><h1>Your profile</h1><p>Your account details</p></div>
          <Link className="secondary-button" to={ROUTES.projects}>Back to projects</Link>
        </header>
        <section className="profile-card" aria-label="Your account">
          <div className="profile-card-avatar" aria-hidden="true">{getInitials(user?.fullName)}</div>
          <dl className="profile-details">
            <div><dt>Full name</dt><dd>{user?.fullName}</dd></div>
            <div><dt>Email</dt><dd>{user?.email}</dd></div>
            <div><dt>Account role</dt><dd>{user?.role === 'ADMIN' ? 'Administrator' : 'User'}</dd></div>
          </dl>
        </section>
      </main>
    </DashboardLayout>
  )
}

export default ProfilePage
