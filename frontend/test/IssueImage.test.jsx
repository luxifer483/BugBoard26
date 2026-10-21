// Verifica il caricamento privato dell'allegato, il recupero dagli errori e la pulizia degli URL temporanei.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import IssueImage from '../src/components/IssueImage'
import { getIssueImage } from '../src/api/issuesApi'

vi.mock('../src/api/issuesApi', () => ({ getIssueImage: vi.fn() }))

beforeEach(() => {
  vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:private-image'), revokeObjectURL: vi.fn() })
})
afterEach(() => vi.unstubAllGlobals())

test('shows the downloaded image and releases its URL on unmount', async () => {
  const blob = new Blob(['image'], { type: 'image/png' })
  getIssueImage.mockResolvedValueOnce(blob)
  const { unmount } = render(<IssueImage issueId={12} />)
  expect(await screen.findByRole('img')).toHaveAttribute('src', 'blob:private-image')
  expect(getIssueImage).toHaveBeenCalledWith(12)
  expect(URL.createObjectURL).toHaveBeenCalledWith(blob)
  expect(screen.getByRole('link')).toHaveAttribute('href', 'blob:private-image')
  unmount()
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:private-image')
})

test('shows an error and successfully retries the download', async () => {
  getIssueImage.mockRejectedValueOnce(new Error('Forbidden'))
  getIssueImage.mockResolvedValueOnce(new Blob(['image'], { type: 'image/png' }))
  render(<IssueImage issueId={12} />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load the image.')
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  await screen.findByRole('img')
  expect(getIssueImage).toHaveBeenCalledTimes(2)
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test('does not create an object URL if a pending download finishes after unmount', async () => {
  let resolveDownload
  getIssueImage.mockReturnValueOnce(new Promise((resolve) => { resolveDownload = resolve }))
  const { unmount } = render(<IssueImage issueId={12} />)
  expect(screen.getByRole('status')).toHaveTextContent('Loading image...')
  unmount()
  resolveDownload(new Blob(['image'], { type: 'image/png' }))
  await waitFor(() => expect(URL.createObjectURL).not.toHaveBeenCalled())
})
