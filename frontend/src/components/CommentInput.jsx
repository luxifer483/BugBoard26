import { useState } from 'react'
import { getInitials } from '../utils/formatters'

function CommentInput({ currentUser, onSubmit, disabled = false }) {
  const [content, setContent] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()

    const trimmedContent = content.trim()

    if (!trimmedContent) {
      return
    }

    await onSubmit(trimmedContent)
    setContent('')
  }

  return (
    <form className="comment-input" onSubmit={handleSubmit}>
      <div className="comment-avatar" aria-hidden="true">
        {getInitials(currentUser?.fullName)}
      </div>
      <div className="comment-input-body">
        <textarea
          placeholder="Add a comment..."
          value={content}
          onChange={(event) => setContent(event.target.value)}
          disabled={disabled}
        />
        <button type="submit" disabled={disabled || !content.trim()}>
          Add Comment
        </button>
      </div>
    </form>
  )
}

export default CommentInput
