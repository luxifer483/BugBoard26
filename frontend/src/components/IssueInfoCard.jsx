import { getInitials } from '../utils/formatters'
import StatusDropdown from './StatusDropdown'

function formatDetailDate(value, includeTime = false) {
  if (!value) {
    return 'Not available'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(includeTime
      ? {
          hour: 'numeric',
          minute: '2-digit',
        }
      : {}),
  }).format(date)
}

function PersonDetail({ label, person }) {
  return (
    <div className="issue-detail-person">
      <span className="issue-detail-label">{label}</span>
      <div className="issue-detail-person-row">
        <div className="issue-detail-avatar" aria-hidden="true">
          {getInitials(person?.fullName)}
        </div>
        <div>
          <strong>{person?.fullName || 'Unassigned'}</strong>
          <span>{person?.role || 'No role'}</span>
        </div>
      </div>
    </div>
  )
}

function DateDetail({ label, value, includeTime = false }) {
  return (
    <div className="issue-detail-date">
      <span className="issue-detail-label">{label}</span>
      <strong>{formatDetailDate(value, includeTime)}</strong>
    </div>
  )
}

function IssueInfoCard({ issue, onStatusChange, isUpdatingStatus, members,
  onAssigneeChange, isAssigning }) {
  return (
    <aside className="issue-info-card" aria-label="Issue details">
      <h2>Details</h2>
      <PersonDetail label="Assigned to" person={issue.assignee} />
      <label className="status-dropdown">
        <span>Change Assignee</span>
        <select value={issue.assignee?.id ?? ''} disabled={isAssigning || isUpdatingStatus}
          onChange={(event) => onAssigneeChange(event.target.value)}>
          <option value="">Unassigned</option>
          {issue.assignee && !members.some((member) => member.id === issue.assignee.id) ? (
            <option value={issue.assignee.id} disabled>{issue.assignee.fullName} (former member)</option>
          ) : null}
          {members.map((member) => <option key={member.id} value={member.id}>{member.fullName}</option>)}
        </select>
      </label>
      <PersonDetail label="Reporter" person={issue.reporter} />
      <DateDetail label="Created" value={issue.createdAt} />
      <DateDetail label="Last Updated" value={issue.updatedAt} includeTime />
      <StatusDropdown
        value={issue.status}
        onChange={onStatusChange}
        disabled={isUpdatingStatus || isAssigning || issue.status === 'CLOSED'}
      />
    </aside>
  )
}

export default IssueInfoCard
