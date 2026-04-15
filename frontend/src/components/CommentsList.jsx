import { getInitials } from '../utils/formatters'
import CommentInput from './CommentInput'

function formatCommentDate(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value || ''
  }

  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function CommentsList({
  comments,
  currentUser,
  onAddComment,
  isSubmittingComment,
}) {
  return (
    <section className="comments-panel" aria-label="Issue comments">
      <h2>Comments ({comments.length})</h2>

      <div className="comments-list">
        {comments.map((comment) => (
          <article className="comment-item" key={comment.id}>
            <div className="comment-avatar" aria-hidden="true">
              {getInitials(comment.author?.fullName)}
            </div>
            <div className="comment-content">
              <div className="comment-meta">
                <strong>{comment.author?.fullName || 'Unknown User'}</strong>
                <span>{formatCommentDate(comment.createdAt)}</span>
              </div>
              <p>{comment.content}</p>
            </div>
          </article>
        ))}
      </div>

      <CommentInput
        currentUser={currentUser}
        onSubmit={onAddComment}
        disabled={isSubmittingComment}
      />
    </section>
  )
}

export default CommentsList
