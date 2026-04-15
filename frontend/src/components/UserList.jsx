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

function UserList({ members }) {
  return (
    <section className="user-list-card" aria-label="Project members">
      <header className="user-list-header">
        <div>
          <span aria-hidden="true">oo</span>
          <h2>Project Members</h2>
        </div>
        <strong>{members.length}</strong>
      </header>

      <div className="user-list">
        {members.map((member) => (
          <article className="user-list-item" key={member.userId}>
            <div className="user-list-avatar" aria-hidden="true">
              {getInitials(member.fullName)}
            </div>
            <div className="user-list-identity">
              <strong>{member.fullName}</strong>
              <span>{member.email}</span>
            </div>
            <span className={`user-role-badge is-${member.role.toLowerCase()}`}>
              {member.role}
            </span>
            <time dateTime={member.joinedAt}>{formatJoinedDate(member.joinedAt)}</time>
          </article>
        ))}
      </div>
    </section>
  )
}

export default UserList
