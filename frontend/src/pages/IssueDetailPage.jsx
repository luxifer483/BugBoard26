// Carica il dettaglio della issue e coordina commenti, assegnazione e cambio di stato.
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { createComment, getComments } from '../api/commentsApi'
import { getIssueById, updateIssueStatus, updateIssueAssignee } from '../api/issuesApi'
import { getProjectMembers } from '../api/projectMembersApi'
import CommentsList from '../components/CommentsList'
import IssueInfoCard from '../components/IssueInfoCard'
import IssueImage from '../components/IssueImage'
import { useAuth } from '../hooks/useAuth'
import DashboardLayout from '../layouts/DashboardLayout'
import { formatEnumLabel, formatPriorityLabel } from '../utils/formatters'

const STATUS_CLASS_MAP = {
  TODO: 'is-red',
  IN_PROGRESS: 'is-orange',
  CLOSED: 'is-green',
}

const PRIORITY_CLASS_MAP = {
  LOW: 'is-green',
  MEDIUM: 'is-blue',
  HIGH: 'is-orange',
  CRITICAL: 'is-red',
}

function formatHeaderDate(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value || 'Unknown date'
  }

  return new Intl.DateTimeFormat('en', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function IssueDetailPage() {
  const { issueId } = useParams()
  return <IssueDetailContent key={issueId} issueId={issueId} />
}

function IssueDetailContent({ issueId }) {
  const { user, refreshNotifications } = useAuth()
  const [issue, setIssue] = useState(null)
  const [comments, setComments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isAssigning, setIsAssigning] = useState(false)
  const [members, setMembers] = useState([])
  const [actionError, setActionError] = useState('')
  const canChangeStatus = Boolean(user?.id && issue?.assignee?.id
    && String(user.id) === String(issue.assignee.id))

  useEffect(() => {
    let isMounted = true

    async function loadIssueDetail() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const [issueResponse, commentsResponse] = await Promise.all([
          getIssueById(issueId),
          getComments(Number(issueId)),
        ])

        if (!isMounted) {
          return
        }

        if (!issueResponse) {
          setErrorMessage('Issue not found.')
          setIssue(null)
          setComments([])
          return
        }

        const membersResponse = await getProjectMembers(issueResponse.project.id)
        if (!isMounted) return
        setMembers(membersResponse.items.map((member) => ({ ...member, id: member.userId })))
        setIssue(issueResponse)
        setComments(commentsResponse.items)
      } catch {
        if (isMounted) {
          setErrorMessage('Unable to load issue details right now.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadIssueDetail()

    return () => {
      isMounted = false
    }
  }, [issueId])

  // Prepara la richiesta di cambio stato soltanto se l'utente e' l'assegnatario.
  async function handleStatusChange(nextStatus) {
    if (!issue || !canChangeStatus || nextStatus === issue.status) {
      return
    }

    setIsUpdatingStatus(true)
    setActionError('')

    try {
      setIssue(await updateIssueStatus(issue.id, { status: nextStatus }))
      refreshNotifications()
    } catch (error) {
      setActionError(error.response?.data?.message || 'Unable to update the issue status.')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  async function handleAssigneeChange(assigneeId) {
    setIsAssigning(true)
    setActionError('')
    try {
      const assignee = members.find((member) => member.id === Number(assigneeId)) || null
      setIssue(await updateIssueAssignee(issue.id, assignee))
      refreshNotifications()
    } catch (error) {
      setActionError(error.response?.data?.message || 'Unable to update the assignee.')
    } finally {
      setIsAssigning(false)
    }
  }

  async function handleAddComment(content) {
    if (!issue) {
      return
    }

    setIsSubmittingComment(true)
    setActionError('')

    try {
      const createdComment = await createComment(issue.id, {
        content,
        author: user,
      })

      setComments((currentComments) => [
        ...currentComments,
        createdComment,
      ])
      setIssue((current) => ({ ...current, updatedAt: createdComment.createdAt }))
      refreshNotifications()
      return true
    } catch (error) {
      setActionError(error.response?.data?.message || 'Unable to add the comment. Your text has been kept.')
      return false
    } finally {
      setIsSubmittingComment(false)
    }
  }

  return (
    <DashboardLayout projectId={issue?.project?.id ? String(issue.project.id) : ''}>
      <main className="issue-detail-page">
        {isLoading ? <p className="status-message">Loading issue detail...</p> : null}
        {errorMessage ? <p className="status-message is-error">{errorMessage}</p> : null}
        {actionError ? <p role="alert" className="status-message is-error">{actionError}</p> : null}

        {!isLoading && !errorMessage && issue ? (
          <>
            <header className="issue-detail-header">
              <Link className="issue-detail-project" to={`/dashboard/${issue.project.id}`}>
                {issue.project.name}
              </Link>
              <div className="issue-detail-kicker">
                <span>{issue.code}</span>
                <span>Created {formatHeaderDate(issue.createdAt)}</span>
              </div>
              <h1>{issue.title}</h1>
              <div className="issue-detail-tags">
                <span className="issue-chip is-red">{formatEnumLabel(issue.type)}</span>
                <span className={`issue-chip ${STATUS_CLASS_MAP[issue.status] || 'is-blue'}`}>
                  {formatEnumLabel(issue.status)}
                </span>
                <span className={`issue-chip ${PRIORITY_CLASS_MAP[issue.priority] || 'is-blue'}`}>
                  Priority: {formatPriorityLabel(issue.priority)}
                </span>
              </div>
            </header>

            <div className="issue-detail-grid">
              <div className="issue-detail-main">
                <section className="issue-description-panel">
                  <h2>Description</h2>
                  <p>{issue.description}</p>
                </section>

                {issue.image ? <IssueImage key={issue.id} issueId={issue.id} /> : null}

                <CommentsList
                  comments={comments}
                  currentUser={user}
                  onAddComment={handleAddComment}
                  isSubmittingComment={isSubmittingComment}
                />
              </div>

              <IssueInfoCard
                issue={issue}
                canChangeStatus={canChangeStatus}
                onStatusChange={handleStatusChange}
                isUpdatingStatus={isUpdatingStatus}
                members={members}
                onAssigneeChange={handleAssigneeChange}
                isAssigning={isAssigning}
              />
            </div>
          </>
        ) : null}
      </main>
    </DashboardLayout>
  )
}

export default IssueDetailPage
