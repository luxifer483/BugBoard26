// Verifica che il controllo dello stato rispetti i permessi e mostri le indicazioni corrette.
import { expect, test, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import IssueInfoCard from '../src/components/IssueInfoCard'

const issue = { id: 12, status: 'TODO', assignee: { id: 7, fullName: 'Assigned user' } }

// Verifica che l'assegnatario trovi il controllo del cambio stato.
test('enables the status control for the assignee', () => {
  render(<IssueInfoCard issue={issue} canChangeStatus members={[]} />)
  expect(screen.getByLabelText('Change Status')).toBeEnabled()
})

// Verifica che membri e ADMIN non assegnatari vedano lo stato senza un controllo modificabile.
test('shows read-only status for other members and administrators', () => {
  render(<IssueInfoCard issue={issue} canChangeStatus={false} members={[]} />)
  expect(screen.queryByLabelText('Change Status')).not.toBeInTheDocument()
  expect(screen.getByText('Status')).toBeInTheDocument()
  expect(screen.getByText('To do')).toBeInTheDocument()
  expect(screen.getByText('Only the assigned user can change the status.')).toBeInTheDocument()
})

// Verifica che una issue libera mostri lo stato e la spiegazione del permesso necessario.
test('asks for an assignee before changing an unassigned issue status', () => {
  render(<IssueInfoCard issue={{ ...issue, assignee: null }} canChangeStatus={false} members={[]} />)
  expect(screen.queryByLabelText('Change Status')).not.toBeInTheDocument()
  expect(screen.getByText('Assign this issue before changing its status.')).toBeInTheDocument()
})

// Verifica che lo stato CLOSED rimanga finale anche per l'assegnatario.
test('keeps closed issue status disabled even for the assignee', () => {
  render(<IssueInfoCard issue={{ ...issue, status: 'CLOSED' }} canChangeStatus members={[]} />)
  expect(screen.getByLabelText('Change Status')).toBeDisabled()
})

// Verifica che l'ADMIN scelga un membro oppure Unassigned mantenendo i dettagli visibili.
test('ADMIN can select a project member or remove the assignment', () => {
  const onAssigneeChange = vi.fn()
  render(<IssueInfoCard issue={issue} canChangeAssignee onAssigneeChange={onAssigneeChange}
    members={[{ id: 7, fullName: 'Assigned user' }, { id: 8, fullName: 'Another member' }]} />)
  const select = screen.getByLabelText('Change Assignee')
  fireEvent.change(select, { target: { value: '8' } })
  fireEvent.change(select, { target: { value: '' } })
  expect(onAssigneeChange.mock.calls).toEqual([['8'], ['']])
  expect(screen.queryByRole('button', { name: 'Assign to me' })).not.toBeInTheDocument()
})

// Verifica che il USER trovi soltanto l'autoassegnazione per una issue libera.
test('USER sees only Assign to me for an unassigned issue', () => {
  const onAssignToMe = vi.fn()
  render(<IssueInfoCard issue={{ ...issue, assignee: null }} canAssignToMe onAssignToMe={onAssignToMe} />)
  expect(screen.queryByLabelText('Change Assignee')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Assign to me' }))
  expect(onAssignToMe).toHaveBeenCalledOnce()
})

// Verifica che anche l'assegnatario USER veda l'assegnazione in sola lettura senza perdere nessun dettaglio.
test('assigned USER keeps all Details visible without assignment controls', () => {
  render(<IssueInfoCard issue={{ ...issue, reporter: { fullName: 'Issue reporter' },
    createdAt: '2026-10-20T12:00:00Z', updatedAt: '2026-10-25T12:00:00Z' }} canChangeStatus />)
  const details = within(screen.getByRole('complementary', { name: 'Issue details' }))
  for (const label of ['Assigned to', 'Reporter', 'Created', 'Last Updated', 'Status']) {
    expect(details.getByText(label)).toBeInTheDocument()
  }
  expect(details.getByText('Assigned user')).toBeInTheDocument()
  expect(details.queryByLabelText('Change Assignee')).not.toBeInTheDocument()
  expect(details.queryByRole('button', { name: 'Assign to me' })).not.toBeInTheDocument()
  expect(details.getByLabelText('Change Status')).toBeEnabled()
})
