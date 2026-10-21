// Scarica e mostra l'immagine privata della issue senza esporre il token nell'indirizzo.
import { useEffect, useState } from 'react'
import { getIssueImage } from '../api/issuesApi'

// Libera l'URL temporaneo quando il componente viene chiuso o il caricamento viene ripetuto.
function IssueImage({ issueId }) {
  const [imageUrl, setImageUrl] = useState('')
  const [hasError, setHasError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    let url
    getIssueImage(issueId)
      .then((blob) => {
        if (!active) return
        url = URL.createObjectURL(blob)
        setImageUrl(url)
      })
      .catch(() => { if (active) setHasError(true) })
    return () => {
      active = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [issueId, attempt])

  return (
    <section className="issue-image-panel" aria-label="Attached image">
      <h2>Attached image</h2>
      {hasError ? (
        <p role="alert" className="status-message is-error">
          Unable to load the image.{' '}
          <button className="secondary-button" type="button" onClick={() => {
            setHasError(false)
            setAttempt((value) => value + 1)
          }}>Retry</button>
        </p>
      ) : imageUrl ? (
        <a href={imageUrl} target="_blank" rel="noreferrer" aria-label="Open attached image">
          <img src={imageUrl} alt="Image attached to this issue" />
        </a>
      ) : <p className="status-message" role="status">Loading image...</p>}
    </section>
  )
}

export default IssueImage
