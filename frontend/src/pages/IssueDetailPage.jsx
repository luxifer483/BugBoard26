import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { createComment, getComments } from '../api/commentsApi'
import { getIssueById, updateIssueStatus } from '../api/issuesApi'
import CommentsList from '../components/CommentsList'
import IssueInfoCard from '../components/IssueInfoCard'
import { useAuth } from '../hooks/useAuth'
import DashboardLayout from '../layouts/DashboardLayout'
import { formatEnumLabel } from '../utils/formatters'

const STATUS_CLASS_MAP = {
  OPEN: 'is-red',
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
  const { user } = useAuth()
  const [issue, setIssue] = useState(null)
  const [comments, setComments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)

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

  async function handleStatusChange(nextStatus) {
    if (!issue || nextStatus === issue.status) {
      return
    }

    setIsUpdatingStatus(true)

    try {
      await updateIssueStatus(issue.id, { status: nextStatus })
      setIssue((currentIssue) => ({
        ...currentIssue,
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      }))
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  async function handleAddComment(content) {
    if (!issue) {
      return
    }

    setIsSubmittingComment(true)

    try {
      const createdComment = await createComment(issue.id, {
        content,
        author: user,
      })

      setComments((currentComments) => [
        ...currentComments,
        {
          ...createdComment,
          author: user,
        },
      ])
    } finally {
      setIsSubmittingComment(false)
    }
  }

  return (
    <DashboardLayout projectId={issue?.project?.id ? String(issue.project.id) : ''}>
      <main className="issue-detail-page">
        {isLoading ? <p className="status-message">Loading issue detail...</p> : null}
        {errorMessage ? <p className="status-message is-error">{errorMessage}</p> : null}

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
                  Priority: {formatEnumLabel(issue.priority)}
                </span>
              </div>
            </header>

            <div className="issue-detail-grid">
              <div className="issue-detail-main">
                <section className="issue-description-panel">
                  <h2>Description</h2>
                  <p>{issue.description}</p>
                </section>

                <CommentsList
                  comments={comments}
                  currentUser={user}
                  onAddComment={handleAddComment}
                  isSubmittingComment={isSubmittingComment}
                />
              </div>

              <IssueInfoCard
                issue={issue}
                onStatusChange={handleStatusChange}
                isUpdatingStatus={isUpdatingStatus}
              />
            </div>
          </>
        ) : null}
      </main>
    </DashboardLayout>
  )
}

export default IssueDetailPage
