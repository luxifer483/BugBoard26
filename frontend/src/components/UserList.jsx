import { getInitials } from '../utils/formatters'

function formatJoinedDate(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value || ''
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

// Mostra account globali o membri del progetto; la rimozione compare soltanto per le membership.
function UserList({ members, onRemove, isSubmitting, title = 'Project members', showJoinedDate = true }) {
  return (
    <section className="user-list-card" aria-label={title}>
      <header className="user-list-header">
        <div>
          <span aria-hidden="true">oo</span>
          <h2>{title}</h2>
        </div>
        <strong>{members.length}</strong>
      </header>

      <div className="user-list">
        {members.map((member) => (
          <article className={`user-list-item${showJoinedDate ? '' : ' account-list-item'}`} key={member.userId ?? member.id}>
            <div className="user-list-avatar" aria-hidden="true">
              {getInitials(member.fullName)}
            </div>
            <div className="user-list-identity">
              <strong>{member.fullName}</strong>
              <span>{member.email}</span>
              {onRemove ? (
                <button className="user-list-remove" type="button" disabled={isSubmitting}
                  onClick={() => onRemove(member)}>Remove from project</button>
              ) : null}
            </div>
            <span className={`user-role-badge is-${member.role === 'ADMIN' ? 'admin' : 'user'}`}>
              {member.role === 'ADMIN' ? 'ADMIN' : 'USER'}
            </span>
            {showJoinedDate ? <time dateTime={member.joinedAt}>{formatJoinedDate(member.joinedAt)}</time> : null}
          </article>
        ))}
      </div>
      {!members.length ? <p className="user-list-empty">No accounts to show.</p> : null}
    </section>
  )
}

export default UserList
