// Verifica le transizioni disponibili e l'uso del menu di stato con mouse e tastiera.
import { expect, test, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import StatusDropdown from '../src/components/StatusDropdown'

// Impedisce il salto da To do a Closed e permette i due avanzamenti gia previsti.
test('allows TODO to IN_PROGRESS to CLOSED without offering forbidden transitions', () => {
  const onChange = vi.fn()
  const { rerender } = render(<StatusDropdown value="TODO" onChange={onChange} />)
  fireEvent.click(screen.getByRole('button', { name: 'Change Status' }))
  expect(screen.getByRole('option', { name: 'Closed' })).toBeDisabled()
  fireEvent.click(screen.getByRole('option', { name: 'Closed' }))
  expect(onChange).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('option', { name: 'In Progress' }))
  expect(onChange).toHaveBeenLastCalledWith('IN_PROGRESS')
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  rerender(<StatusDropdown value="IN_PROGRESS" onChange={onChange} />)
  fireEvent.click(screen.getByRole('button', { name: 'Change Status' }))
  expect(screen.getByRole('option', { name: 'To do' })).toBeDisabled()
  fireEvent.click(screen.getByRole('option', { name: 'Closed' }))
  expect(onChange).toHaveBeenLastCalledWith('CLOSED')
  rerender(<StatusDropdown value="CLOSED" onChange={onChange} disabled />)
  expect(screen.getByRole('button', { name: 'Change Status' })).toBeDisabled()
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
})

// Le frecce saltano gli stati vietati; Escape e il clic esterno chiudono senza salvare.
test('supports keyboard navigation and dismisses the menu without changing status', () => {
  const onChange = vi.fn()
  render(<StatusDropdown value="IN_PROGRESS" onChange={onChange} />)
  const trigger = screen.getByRole('button', { name: 'Change Status' })
  fireEvent.keyDown(trigger, { key: 'ArrowDown' })
  expect(screen.getByRole('option', { name: 'In Progress' })).toHaveFocus()
  fireEvent.keyDown(document.activeElement, { key: 'ArrowUp' })
  expect(screen.getByRole('option', { name: 'Closed' })).toHaveFocus()
  fireEvent.keyDown(document.activeElement, { key: 'Home' })
  expect(screen.getByRole('option', { name: 'In Progress' })).toHaveFocus()
  fireEvent.keyDown(document.activeElement, { key: 'End' })
  expect(screen.getByRole('option', { name: 'Closed' })).toHaveFocus()
  fireEvent.keyDown(document.activeElement, { key: 'Escape' })
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  expect(trigger).toHaveFocus()
  fireEvent.click(trigger)
  fireEvent.pointerDown(document.body)
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  expect(onChange).not.toHaveBeenCalled()
})
