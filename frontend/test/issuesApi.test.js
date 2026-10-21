// Verifica i dati inviati dalle API del frontend, sia in JSON sia con un file multipart.
import { expect, test, vi } from 'vitest'
import apiClient from '../src/api/client'
import { createIssue, getIssueImage } from '../src/api/issuesApi'

vi.mock('../src/api/client', () => ({ default: { post: vi.fn(), get: vi.fn() } }))
vi.mock('../src/config/apiConfig', () => ({ USE_MOCK_API: false }))

const payload = { title: 'Bug', description: 'Steps', type: 'BUG', priority: null,
  project: { id: 3 }, assignee: null }

test('keeps JSON compatibility when creating an issue without an image', async () => {
  apiClient.post.mockResolvedValueOnce({ data: { id: 12 } })
  expect(await createIssue(payload)).toEqual({ id: 12 })
  expect(apiClient.post).toHaveBeenCalledWith('/issues', {
    title: 'Bug', description: 'Steps', type: 'BUG', projectId: 3, priority: null, assigneeId: null,
  }, undefined)
})

test('sends the file and issue fields as multipart without forcing a JSON content type', async () => {
  apiClient.post.mockResolvedValueOnce({ data: { id: 12 } })
  const file = new File(['image'], 'screen.png', { type: 'image/png' })
  await createIssue({ ...payload, image: file, assignee: { id: 7 } })
  const [path, form, config] = apiClient.post.mock.calls[0]
  expect(path).toBe('/issues')
  expect(form).toBeInstanceOf(FormData)
  expect(form.get('image')).toBe(file)
  expect(form.get('title')).toBe('Bug')
  expect(form.get('projectId')).toBe('3')
  expect(form.get('assigneeId')).toBe('7')
  expect(form.has('priority')).toBe(false)
  expect(config.headers['Content-Type']).toBeUndefined()
})

test('downloads images through the authenticated HTTP client as binary data', async () => {
  const blob = new Blob(['image'], { type: 'image/png' })
  apiClient.get.mockResolvedValueOnce({ data: blob })
  expect(await getIssueImage(12)).toBe(blob)
  expect(apiClient.get).toHaveBeenCalledWith('/issues/12/image', { responseType: 'blob' })
})
