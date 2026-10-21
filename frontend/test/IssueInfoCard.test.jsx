// Verifica che il controllo dello stato rispetti i permessi e mostri le indicazioni corrette.
import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import IssueInfoCard from '../src/components/IssueInfoCard'

const issue = { id: 12, status: 'TODO', assignee: { id: 7, fullName: 'Assigned user' } }

test('enables the status control for the assignee', () => {
  render(<IssueInfoCard issue={issue} canChangeStatus members={[]} />)
  expect(screen.getByLabelText('Change Status')).toBeEnabled()
})

test('disables the status control for other members and administrators', () => {
  render(<IssueInfoCard issue={issue} canChangeStatus={false} members={[]} />)
  expect(screen.getByLabelText('Change Status')).toBeDisabled()
  expect(screen.getByText('Only the assigned user can change the status.')).toBeInTheDocument()
})

test('asks for an assignee before changing an unassigned issue status', () => {
  render(<IssueInfoCard issue={{ ...issue, assignee: null }} canChangeStatus={false} members={[]} />)
  expect(screen.getByLabelText('Change Status')).toBeDisabled()
  expect(screen.getByText('Assign this issue before changing its status.')).toBeInTheDocument()
})

test('keeps closed issue status disabled even for the assignee', () => {
  render(<IssueInfoCard issue={{ ...issue, status: 'CLOSED' }} canChangeStatus members={[]} />)
  expect(screen.getByLabelText('Change Status')).toBeDisabled()
})
