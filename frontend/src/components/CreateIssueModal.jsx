// Raccoglie i dati della nuova issue e un'immagine facoltativa prima di inviarli alle API.
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createIssue } from '../api/issuesApi'
import { getProjectMembers } from '../api/projectMembersApi'
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
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [image, setImage] = useState(null)
  const [imageError, setImageError] = useState('')
  const imageInput = useRef(null)

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
      setErrorMessage('')
      setImage(null)
      setImageError('')
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
        const membersResponse = await getProjectMembers(projectId)

        if (!isMounted) {
          return
        }

        const nextOptions = membersResponse.items
          .map((member) => ({ ...member, id: member.userId }))

        setAssigneeOptions(nextOptions)
      } catch {
        if (isMounted) {
          setAssigneeOptions([])
          setErrorMessage('Unable to load project members. Close this dialog and try again.')
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

  // Controlla tipo e dimensione per dare un messaggio immediato; il backend ricontrolla il file.
  function handleImageChange(event) {
    const file = event.target.files[0] || null
    setImage(null)
    setImageError('')
    if (file && (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
        || file.size > 5 * 1024 * 1024 || file.size === 0)) {
      setImageError('Choose a PNG, JPEG or WebP image, up to 5 MB.')
      event.target.value = ''
      return
    }
    setImage(file)
  }

  // Prepara la richiesta; il salvataggio effettivo viene eseguito dal backend.
  async function handleSubmit(event) {
    event.preventDefault()

    if (imageError) return
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
        priority: formState.priority || null,
        reporter: user,
        assignee,
        project: { id: Number(projectId) },
        image,
      })

      onIssueCreated?.(createdIssue)
      onClose()
      navigate(`/issues/${createdIssue.id}`)
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Unable to create the issue right now.')
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
              maxLength={200}
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
              maxLength={10000}
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
              <span>Priority (optional)</span>
              <select
                name="priority"
                onChange={handleFieldChange}
                value={formState.priority}
              >
                <option value="">Not specified</option>
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

          <label className="form-field">
            <span id="issue-image-label">Image (optional)</span>
            <input ref={imageInput} type="file" name="image" accept="image/png,image/jpeg,image/webp"
              onChange={handleImageChange} disabled={isSubmitting} aria-labelledby="issue-image-label"
              aria-describedby="issue-image-help" />
            <small id="issue-image-help">PNG, JPEG or WebP, up to 5 MB and 16 megapixels. No animated images.</small>
          </label>
          {image ? (
            <div className="issue-image-selection">
              <span>{image.name}</span>
              <button className="secondary-button" type="button" disabled={isSubmitting} onClick={() => {
                setImage(null)
                if (imageInput.current) imageInput.current.value = ''
              }}>Remove image</button>
            </div>
          ) : null}
          {imageError ? <p role="alert" className="status-message is-error">{imageError}</p> : null}

          {errorMessage ? <p className="status-message is-error">{errorMessage}</p> : null}

          <div className="create-issue-actions">
            <button className="primary-button" disabled={isSubmitting || Boolean(imageError)} type="submit">
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
