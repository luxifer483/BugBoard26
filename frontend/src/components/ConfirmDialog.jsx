import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon'

// Conferma accessibile: focus nel dialogo, Escape, ripristino del focus e blocco dello sfondo.
export default function ConfirmDialog({ title, description, children, confirmLabel, pendingLabel,
  isPending = false, error, onCancel, onConfirm }) {
  const id = useId()
  const backdropRef = useRef(null)
  const dialogRef = useRef(null)
  const cancelRef = useRef(null)

  useEffect(() => {
    const previousFocus = document.activeElement
    const overflow = document.body.style.overflow
    const siblings = [...document.body.children].filter((element) => !element.contains(backdropRef.current))
    const inertValues = siblings.map((element) => element.inert)
    siblings.forEach((element) => { element.inert = true })
    document.body.style.overflow = 'hidden'
    if (isPending) dialogRef.current?.focus()
    else cancelRef.current?.focus()
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (!isPending) onCancel()
      }
      if (event.key === 'Tab') {
        const controls = [...dialogRef.current.querySelectorAll('button:not(:disabled), [href], input:not(:disabled), [tabindex="0"]')]
        const first = controls[0]
        const last = controls.at(-1)
        if (!first) { event.preventDefault(); return }
        if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement))) {
          event.preventDefault(); last.focus()
        } else if (!event.shiftKey && (document.activeElement === last || !controls.includes(document.activeElement))) {
          event.preventDefault(); first.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = overflow
      siblings.forEach((element, index) => { element.inert = inertValues[index] })
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [isPending, onCancel])

  return createPortal(
    <div className="modal-backdrop confirmation-backdrop" ref={backdropRef}>
      <section className="confirmation-dialog" role="alertdialog" aria-modal="true"
        aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}
        aria-busy={isPending} tabIndex={-1} ref={dialogRef}>
        <button type="button" className="confirmation-close" aria-label="Close confirmation"
          onClick={onCancel} disabled={isPending}><Icon name="close" /></button>
        <div className="confirmation-warning"><Icon name="warning" size={28} /></div>
        <h2 id={`${id}-title`}>{title}</h2>
        <p id={`${id}-description`} className="confirmation-description">{description}</p>
        {children}
        {error ? <p role="alert" className="status-message is-error">{error}</p> : null}
        <div className="confirmation-actions">
          <button type="button" className="secondary-button" ref={cancelRef} onClick={onCancel} disabled={isPending}>Cancel</button>
          <button type="button" className="confirmation-submit" onClick={onConfirm} disabled={isPending}>
            {isPending ? pendingLabel || 'Please wait...' : confirmLabel}
          </button>
        </div>
      </section>
    </div>, document.body,
  )
}
