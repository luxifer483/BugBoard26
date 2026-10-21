// Verifica il modulo di creazione, inclusi i controlli del file e il mantenimento dei dati in caso di errore.
import { beforeEach, expect, test, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import CreateIssueModal from '../src/components/CreateIssueModal'
import { AuthContext } from '../src/context/auth-context'
import { createIssue } from '../src/api/issuesApi'
import { getProjectMembers } from '../src/api/projectMembersApi'

vi.mock('../src/api/issuesApi', () => ({ createIssue: vi.fn() }))
vi.mock('../src/api/projectMembersApi', () => ({ getProjectMembers: vi.fn() }))

beforeEach(() => {
  getProjectMembers.mockResolvedValue({ items: [{ userId: 7, fullName: 'Team member' }] })
  createIssue.mockResolvedValue({ id: 12 })
})

// Apre il modulo con una sessione e riempie soltanto i campi obbligatori.
async function openForm() {
  const onClose = vi.fn()
  const onIssueCreated = vi.fn()
  render(
    <MemoryRouter>
      <AuthContext.Provider value={{ user: { id: 1, role: 'USER' } }}>
        <Routes>
          <Route path="/" element={<CreateIssueModal isOpen projectId={3} onClose={onClose} onIssueCreated={onIssueCreated} />} />
          <Route path="/issues/:id" element={<p>Issue detail</p>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  )
  await screen.findByRole('option', { name: 'Team member' })
  fireEvent.change(screen.getByLabelText('Title *'), { target: { value: ' Broken button ' } })
  fireEvent.change(screen.getByLabelText('Description *'), { target: { value: ' Steps to reproduce ' } })
  fireEvent.change(screen.getByLabelText('Issue Type *'), { target: { value: 'BUG' } })
  return { onClose, onIssueCreated }
}

test('creates an issue without priority or image and opens its detail', async () => {
  const { onClose, onIssueCreated } = await openForm()
  fireEvent.click(screen.getByRole('button', { name: 'Create Issue' }))
  await screen.findByText('Issue detail')
  expect(createIssue).toHaveBeenCalledWith(expect.objectContaining({
    title: 'Broken button', description: 'Steps to reproduce', priority: null, image: null,
  }))
  expect(onClose).toHaveBeenCalledOnce()
  expect(onIssueCreated).toHaveBeenCalledWith({ id: 12 })
})

test('submits the chosen image and selected project member', async () => {
  await openForm()
  const file = new File(['image bytes'], 'screen.png', { type: 'image/png' })
  fireEvent.change(screen.getByLabelText('Image (optional)'), { target: { files: [file] } })
  fireEvent.change(screen.getByLabelText('Assignee'), { target: { value: '7' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create Issue' }))
  await screen.findByText('Issue detail')
  expect(createIssue).toHaveBeenCalledWith(expect.objectContaining({ image: file, assignee: expect.objectContaining({ id: 7 }) }))
})

test('removes the image before submitting the issue', async () => {
  await openForm()
  fireEvent.change(screen.getByLabelText('Image (optional)'), {
    target: { files: [new File(['image'], 'screen.webp', { type: 'image/webp' })] },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Remove image' }))
  expect(screen.queryByText('screen.webp')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Create Issue' }))
  await waitFor(() => expect(createIssue).toHaveBeenCalledWith(expect.objectContaining({ image: null })))
})

test.each([
  ['unsupported', () => new File(['text'], 'file.svg', { type: 'image/svg+xml' })],
  ['oversized', () => new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' })],
  ['empty', () => new File([], 'empty.png', { type: 'image/png' })],
])('rejects an %s image and allows choosing a valid replacement', async (name, makeFile) => {
  await openForm()
  fireEvent.change(screen.getByLabelText('Image (optional)'), { target: { files: [makeFile()] } })
  expect(screen.getByRole('alert')).toHaveTextContent('up to 5 MB')
  expect(screen.getByRole('button', { name: 'Create Issue' })).toBeDisabled()
  expect(createIssue).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('Image (optional)'), {
    target: { files: [new File(['image'], 'valid.jpg', { type: 'image/jpeg' })] },
  })
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Create Issue' })).toBeEnabled()
})

test('keeps entered text and the image when the backend rejects the request', async () => {
  createIssue.mockRejectedValueOnce({ response: { data: { message: 'Choose a valid image.' } } })
  const { onClose } = await openForm()
  fireEvent.change(screen.getByLabelText('Image (optional)'), {
    target: { files: [new File(['invalid'], 'screen.png', { type: 'image/png' })] },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Create Issue' }))
  await screen.findByText('Choose a valid image.')
  expect(screen.getByLabelText('Title *')).toHaveValue(' Broken button ')
  expect(screen.getByText('screen.png')).toBeInTheDocument()
  expect(onClose).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Create Issue' })).toBeEnabled()
})
