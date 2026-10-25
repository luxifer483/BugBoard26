// Verifica i permessi nella pagina reale del dettaglio, simulando soltanto le risposte HTTP.
import { beforeEach, expect, test, vi } from 'vitest'
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthContext } from '../src/context/auth-context'
import IssueDetailPage from '../src/pages/IssueDetailPage'
import { getIssueById, updateIssueAssignee, updateIssueStatus } from '../src/api/issuesApi'
import { getProjectMembers } from '../src/api/projectMembersApi'
import { createComment, getComments } from '../src/api/commentsApi'

vi.mock('../src/api/issuesApi', () => ({
  getIssueById: vi.fn(), updateIssueAssignee: vi.fn(), updateIssueStatus: vi.fn(), getIssueImage: vi.fn(), createIssue: vi.fn(),
}))
vi.mock('../src/api/projectMembersApi', () => ({ getProjectMembers: vi.fn() }))
vi.mock('../src/api/commentsApi', () => ({ getComments: vi.fn(), createComment: vi.fn() }))

const currentUser = { id: 7, fullName: 'Current member', role: 'USER' }
const otherMember = { id: 8, fullName: 'Another member', role: 'USER' }
const issue = { id: 12, code: 'BUG-26-12', title: 'Assignment permissions', description: 'Issue description',
  type: 'BUG', status: 'TODO', project: { id: 3, name: 'Team project' },
  reporter: otherMember, assignee: null, createdAt: '2026-10-20T12:00:00Z', updatedAt: '2026-10-25T12:00:00Z' }

beforeEach(() => {
  vi.resetAllMocks()
  getIssueById.mockResolvedValue({ ...issue })
  getComments.mockResolvedValue({ items: [] })
  getProjectMembers.mockResolvedValue({ items: [currentUser, otherMember].map((member) => ({ ...member, userId: member.id })) })
})

// Apre la pagina con una sessione reale per il contesto React e API simulate.
async function openDetail(user = currentUser) {
  render(<MemoryRouter initialEntries={['/issues/12']}><AuthContext.Provider value={{
    user, notifications: { items: [], unreadCount: 0 }, refreshNotifications: vi.fn(), readNotification: vi.fn(), logout: vi.fn(),
  }}><Routes><Route path="/issues/:issueId" element={<IssueDetailPage />} /></Routes></AuthContext.Provider></MemoryRouter>)
  await screen.findByRole('heading', { name: issue.title })
  return within(screen.getByRole('complementary', { name: 'Issue details' }))
}

// Verifica che un USER autoassegni la issue e acquisisca il cambio stato senza caricare un elenco di altri assegnatari.
test('USER claims an unassigned issue and immediately gains the status control', async () => {
  updateIssueAssignee.mockResolvedValue({ ...issue, assignee: currentUser })
  const details = await openDetail()
  expect(details.queryByLabelText('Change Assignee')).not.toBeInTheDocument()
  expect(details.queryByLabelText('Change Status')).not.toBeInTheDocument()
  fireEvent.click(details.getByRole('button', { name: 'Assign to me' }))
  await details.findByLabelText('Change Status')
  expect(updateIssueAssignee).toHaveBeenCalledWith(12, currentUser)
  expect(details.queryByRole('button', { name: 'Assign to me' })).not.toBeInTheDocument()
  expect(getProjectMembers).not.toHaveBeenCalled()
})

// Verifica che il non assegnatario legga tutti i dettagli e possa comunque inserire un commento.
test('a USER assigned to someone else sees read-only Details and can comment', async () => {
  getIssueById.mockResolvedValue({ ...issue, assignee: otherMember })
  createComment.mockResolvedValue({ id: 5, content: 'An update from another member', author: currentUser, createdAt: '2026-10-25T13:00:00Z' })
  const details = await openDetail()
  for (const label of ['Assigned to', 'Reporter', 'Created', 'Last Updated', 'Status']) expect(details.getByText(label)).toBeInTheDocument()
  expect(details.queryByLabelText('Change Assignee')).not.toBeInTheDocument()
  expect(details.queryByLabelText('Change Status')).not.toBeInTheDocument()
  expect(details.queryByRole('button', { name: 'Assign to me' })).not.toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Comment'), { target: { value: 'An update from another member' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add Comment' }))
  await screen.findByText('An update from another member')
  expect(createComment).toHaveBeenCalledWith(12, { content: 'An update from another member', author: currentUser })
})

// Verifica che il ruolo globale non sostituisca l'identita dell'assegnatario per il cambio stato.
test.each(['USER', 'ADMIN'])('the assigned %s can advance the existing status transition', async (role) => {
  const user = { ...currentUser, role }
  getIssueById.mockResolvedValue({ ...issue, assignee: user })
  updateIssueStatus.mockResolvedValue({ ...issue, assignee: user, status: 'IN_PROGRESS' })
  const details = await openDetail(user)
  fireEvent.change(details.getByLabelText('Change Status'), { target: { value: 'IN_PROGRESS' } })
  await details.findByText('In Progress')
  expect(updateIssueStatus).toHaveBeenCalledWith(12, { status: 'IN_PROGRESS' })
  expect(Boolean(details.queryByLabelText('Change Assignee'))).toBe(role === 'ADMIN')
  expect(details.queryByRole('button', { name: 'Assign to me' })).not.toBeInTheDocument()
})

// Verifica la scelta ADMIN di un membro e la rimozione, senza consentire il cambio stato a un non assegnatario.
test('ADMIN can assign and unassign while status stays read-only for a nonassignee', async () => {
  updateIssueAssignee.mockResolvedValueOnce({ ...issue, assignee: otherMember }).mockResolvedValueOnce({ ...issue, assignee: null })
  const details = await openDetail({ ...currentUser, role: 'ADMIN' })
  expect(details.queryByLabelText('Change Status')).not.toBeInTheDocument()
  fireEvent.change(details.getByLabelText('Change Assignee'), { target: { value: '8' } })
  await waitFor(() => expect(details.getByLabelText('Change Assignee')).toHaveValue('8'))
  fireEvent.change(details.getByLabelText('Change Assignee'), { target: { value: '' } })
  await details.findByText('Unassigned', { selector: 'strong' })
  expect(updateIssueAssignee.mock.calls).toEqual([[12, expect.objectContaining({ id: 8 })], [12, null]])
  expect(details.queryByLabelText('Change Status')).not.toBeInTheDocument()
})

// Verifica che dopo un conflitto il dettaglio mostri chi ha ottenuto l'assegnazione, senza offrire di sovrascriverla.
test('a losing self-assignment refreshes Details and hides Assign to me', async () => {
  updateIssueAssignee.mockRejectedValue({ response: { data: { code: 'ISSUE_ALREADY_ASSIGNED', message: 'Already assigned by another member.' } } })
  getIssueById.mockResolvedValueOnce({ ...issue }).mockResolvedValueOnce({ ...issue, assignee: otherMember })
  const details = await openDetail()
  fireEvent.click(details.getByRole('button', { name: 'Assign to me' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Already assigned by another member.')
  await waitFor(() => expect(details.queryByRole('button', { name: 'Assign to me' })).not.toBeInTheDocument())
  expect(within(details.getByText('Assigned to').parentElement).getByText(otherMember.fullName)).toBeInTheDocument()
  expect(getIssueById).toHaveBeenCalledTimes(2)
  expect(details.queryByRole('button', { name: 'Assign to me' })).not.toBeInTheDocument()
  expect(details.queryByLabelText('Change Assignee')).not.toBeInTheDocument()
  expect(details.queryByLabelText('Change Status')).not.toBeInTheDocument()
})
