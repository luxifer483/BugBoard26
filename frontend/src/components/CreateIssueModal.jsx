import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createIssue } from '../api/issuesApi'
import { getProjectMembers } from '../api/projectMembersApi'
import { getUsers } from '../api/usersApi'
import { useAuth } from '../hooks/useAuth'

const ISSUE_TYPES = ['BUG', 'FEATURE', 'DOCUMENTATION', 'QUESTION']
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

function CreateIssueModal({ isOpen, projectId, onClose, onIssueCreated }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [formState, setFormState] = useState({
    title: '',
    description: '',
    type: '',
    priority: '',
    assigneeId: '',
  })
  const [assigneeOptions, setAssigneeOptions] = useState([])
  const [selectedFiles, setSelectedFiles] = useState([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      setFormState({
        title: '',
        description: '',
        type: '',
        priority: '',
        assigneeId: '',
      })
      setSelectedFiles([])
      setErrorMessage('')
      return
    }

    if (!projectId) {
      setAssigneeOptions([])
      return
    }

    let isMounted = true

    async function loadAssignableUsers() {
      setIsLoadingMembers(true)

      try {
        const [membersResponse, usersResponse] = await Promise.all([
          getProjectMembers(projectId),
          getUsers(),
        ])

        if (!isMounted) {
          return
        }

        const usersById = new Map(usersResponse.items.map((member) => [member.id, member]))
        const nextOptions = membersResponse.items
          .map((member) => usersById.get(member.userId))
          .filter(Boolean)

        setAssigneeOptions(nextOptions)
      } catch {
        if (isMounted) {
          setAssigneeOptions([])
        }
      } finally {
        if (isMounted) {
          setIsLoadingMembers(false)
        }
      }
    }

    loadAssignableUsers()

    return () => {
      isMounted = false
    }
  }, [isOpen, projectId])

  const attachmentsLabel = useMemo(() => {
    if (!selectedFiles.length) {
      return 'PNG, JPG, GIF up to 10MB'
    }

    return selectedFiles.map((file) => file.name).join(', ')
  }, [selectedFiles])

  if (!isOpen) {
    return null
  }

  function handleFieldChange(event) {
    const { name, value } = event.target

    setFormState((currentState) => ({
      ...currentState,
      [name]: value,
    }))
  }

  function handleOverlayClick(event) {
    if (event.target === event.currentTarget && !isSubmitting) {
      onClose()
    }
  }

  function handleFileChange(event) {
    const nextFiles = Array.from(event.target.files || [])
    setSelectedFiles(nextFiles)
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!projectId) {
      setErrorMessage('Select a project before creating a new issue.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const assignee =
        assigneeOptions.find((member) => member.id === Number(formState.assigneeId)) || null

      const createdIssue = await createIssue({
        title: formState.title.trim(),
        description: formState.description.trim(),
        type: formState.type,
        priority: formState.priority,
        reporter: user,
        assignee,
        project: { id: Number(projectId) },
        attachmentUrl: selectedFiles[0]?.name || '',
      })

      onIssueCreated?.(createdIssue)
      onClose()
      navigate(`/issues/${createdIssue.id}`)
    } catch {
      setErrorMessage('Unable to create the issue right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={handleOverlayClick}
      role="presentation"
    >
      <section
        aria-labelledby="create-issue-modal-title"
        aria-modal="true"
        className="create-issue-modal"
        role="dialog"
      >
        <div className="create-issue-modal-header">
          <div>
            <p>Create and assign a new issue without leaving the current view.</p>
            <h2 id="create-issue-modal-title">Create New Issue</h2>
          </div>
          <button
            aria-label="Close create issue modal"
            className="modal-close-button"
            onClick={onClose}
            type="button"
          >
            x
          </button>
        </div>

        <form className="create-issue-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Title *</span>
            <input
              name="title"
              onChange={handleFieldChange}
              placeholder="Enter issue title"
              required
              type="text"
              value={formState.title}
            />
          </label>

          <label className="form-field">
            <span>Description *</span>
            <textarea
              name="description"
              onChange={handleFieldChange}
              placeholder="Describe the issue in detail..."
              required
              rows={7}
              value={formState.description}
            />
          </label>

          <div className="form-field-grid">
            <label className="form-field">
              <span>Issue Type *</span>
              <select
                name="type"
                onChange={handleFieldChange}
                required
                value={formState.type}
              >
                <option value="">Select type</option>
                {ISSUE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>Priority *</span>
              <select
                name="priority"
                onChange={handleFieldChange}
                required
                value={formState.priority}
              >
                <option value="">Select priority</option>
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="form-field">
            <span>Assignee</span>
            <select
              disabled={isLoadingMembers}
              name="assigneeId"
              onChange={handleFieldChange}
              value={formState.assigneeId}
            >
              <option value="">{isLoadingMembers ? 'Loading members...' : 'Unassigned'}</option>
              {assigneeOptions.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.fullName}
                </option>
              ))}
            </select>
          </label>

          <label className="attachment-dropzone" htmlFor="issue-attachments">
            <span>Attachments</span>
            <input
              id="issue-attachments"
              multiple
              onChange={handleFileChange}
              type="file"
            />
            <strong>Click to upload or drag and drop</strong>
            <small>{attachmentsLabel}</small>
          </label>

          {errorMessage ? <p className="status-message is-error">{errorMessage}</p> : null}

          <div className="create-issue-actions">
            <button className="primary-button" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Creating...' : 'Create Issue'}
            </button>
            <button
              className="secondary-button"
              disabled={isSubmitting}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default CreateIssueModal
