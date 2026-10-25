// Mostra le informazioni della issue e i controlli per assegnazione e stato.
import { getInitials, formatEnumLabel } from '../utils/formatters'
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

// Mantiene visibili i dettagli e mostra soltanto le operazioni consentite dalla pagina.
function IssueInfoCard({ issue, canChangeStatus, canChangeAssignee, canAssignToMe,
  onStatusChange, isUpdatingStatus, members = [], onAssigneeChange, onAssignToMe, isAssigning }) {
  return (
    <aside className="issue-info-card" aria-label="Issue details">
      <h2>Details</h2>
      <PersonDetail label="Assigned to" person={issue.assignee} />
      {canChangeAssignee ? <label className="status-dropdown">
        <span>Change Assignee</span>
        <select value={issue.assignee?.id ?? ''} disabled={isAssigning || isUpdatingStatus}
          onChange={(event) => onAssigneeChange(event.target.value)}>
          <option value="">Unassigned</option>
          {issue.assignee && !members.some((member) => String(member.id) === String(issue.assignee.id)) ? (
            <option value={issue.assignee.id} disabled>{issue.assignee.fullName} (former member)</option>
          ) : null}
          {members.map((member) => <option key={member.id} value={member.id}>{member.fullName}</option>)}
        </select>
      </label> : null}
      {canAssignToMe ? (
        <button className="secondary-button" type="button" disabled={isAssigning || isUpdatingStatus}
          onClick={onAssignToMe}>{isAssigning ? 'Assigning...' : 'Assign to me'}</button>
      ) : null}
      <PersonDetail label="Reporter" person={issue.reporter} />
      <DateDetail label="Created" value={issue.createdAt} />
      <DateDetail label="Last Updated" value={issue.updatedAt} includeTime />
      <div className="issue-detail-date">
        <span className="issue-detail-label">Status</span>
        <strong>{formatEnumLabel(issue.status)}</strong>
      </div>
      {canChangeStatus ? <StatusDropdown
        value={issue.status}
        onChange={onStatusChange}
        disabled={isUpdatingStatus || isAssigning || issue.status === 'CLOSED'}
      /> : null}
      {!canChangeStatus ? (
        <p className="status-message">
          {issue.assignee
            ? 'Only the assigned user can change the status.'
            : 'Assign this issue before changing its status.'}
        </p>
      ) : null}
    </aside>
  )
}

export default IssueInfoCard
