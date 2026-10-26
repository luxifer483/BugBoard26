// Mostra un menu di stato sotto il campo, senza dipendere dal selettore nativo del browser.
import { useEffect, useId, useRef, useState } from 'react'

const STATUS_OPTIONS = [
  { value: 'TODO', label: 'To do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'CLOSED', label: 'Closed' },
]

// Mantiene le transizioni esistenti e consente scelta con mouse o tastiera.
function StatusDropdown({ value, onChange, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const controlId = useId()
  const containerRef = useRef(null)
  const triggerRef = useRef(null)
  const listRef = useRef(null)
  const current = STATUS_OPTIONS.find((option) => option.value === value)

  useEffect(() => {
    if (!isOpen) return undefined
    listRef.current?.querySelector('[aria-selected="true"]')?.focus()
    function closeOutside(event) {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [isOpen])

  // Chiude il menu prima di chiedere alla pagina di salvare il nuovo stato.
  function chooseStatus(nextStatus) {
    setIsOpen(false)
    triggerRef.current?.focus()
    if (nextStatus !== value) onChange(nextStatus)
  }

  // Le frecce saltano gli stati vietati; Escape chiude senza cambiare stato.
  function handleKeyDown(event) {
    if (disabled) return
    if (event.key === 'Escape' && isOpen) {
      event.preventDefault()
      event.stopPropagation()
      setIsOpen(false)
      triggerRef.current?.focus()
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    if (!isOpen) {
      setIsOpen(true)
      return
    }
    const options = [...listRef.current.querySelectorAll('button:not(:disabled)')]
    const index = options.indexOf(document.activeElement)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1
      : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length
    options[next]?.focus()
  }

  return (
    <div className="status-dropdown" ref={containerRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false)
      }}>
      <span id={`${controlId}-label`}>Change Status</span>
      <div className="status-select">
        <button ref={triggerRef} type="button" className="status-select-trigger"
          aria-labelledby={`${controlId}-label`} aria-describedby={`${controlId}-value`}
          aria-haspopup="listbox" aria-expanded={isOpen && !disabled}
          aria-controls={`${controlId}-options`} disabled={disabled}
          onKeyDown={handleKeyDown}
          onClick={() => setIsOpen((open) => !open)}>
          <span id={`${controlId}-value`}>{current?.label}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </button>
        {isOpen && !disabled ? (
          <div id={`${controlId}-options`} ref={listRef} className="status-select-options"
            role="listbox" aria-labelledby={`${controlId}-label`} onKeyDown={handleKeyDown}>
            {STATUS_OPTIONS.map((option) => (
              <button key={option.value} type="button" role="option" tabIndex={-1}
                aria-selected={option.value === value}
                disabled={option.value !== value && !(
                  (value === 'TODO' && option.value === 'IN_PROGRESS') ||
                  (value === 'IN_PROGRESS' && option.value === 'CLOSED')
                )} onClick={() => chooseStatus(option.value)}>
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default StatusDropdown
