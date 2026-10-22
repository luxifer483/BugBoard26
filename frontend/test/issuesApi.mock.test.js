import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { createIssue, getIssueImage, getIssueById, getIssues, updateIssueAssignee, updateIssueStatus } from '../src/api/issuesApi'
import { mockIssues } from '../src/api/mockData'

vi.mock('../src/api/client', () => ({ default: {} }))
vi.mock('../src/config/apiConfig', () => ({ USE_MOCK_API: true }))
vi.mock('../src/api/mockData', () => ({ mockIssues: [] }))

beforeEach(() => {
  vi.useFakeTimers()
  mockIssues.splice(0, mockIssues.length, { id: 1, project: { id: 3 }, status: 'TODO' })
})
afterEach(() => vi.useRealTimers())
async function resolveDelay(promise) {
  await vi.advanceTimersByTimeAsync(250)
  return promise
}

test('mock filters by project and returns null for missing issues', async () => {
  expect((await resolveDelay(getIssues())).totalCount).toBe(1)
  expect((await resolveDelay(getIssues(3))).items).toHaveLength(1)
  expect((await resolveDelay(getIssues(9))).items).toEqual([])
  expect(await resolveDelay(getIssueById(1))).toHaveProperty('id', 1)
  expect(await resolveDelay(getIssueById(99))).toBeNull()
  expect(await resolveDelay(getIssueImage(99))).toBeUndefined()
})

test('mock creates optional images and preserves nullable priority', async () => {
  const base = { title: 'Bug', project: { id: 3 } }
  const plain = await resolveDelay(createIssue(base))
  expect(plain).toMatchObject({ status: 'TODO', priority: null, image: null })
  const file = new File(['image'], 'a.png', { type: 'image/png' })
  const attached = await resolveDelay(createIssue({ ...base, priority: 'HIGH', image: file }))
  expect(attached).toMatchObject({ priority: 'HIGH', image: { contentType: 'image/png', file } })
  expect(await resolveDelay(getIssueImage(attached.id))).toBe(file)
})

test('mock updates status and assignment', async () => {
  expect(await resolveDelay(updateIssueStatus(1, { status: 'IN_PROGRESS' }))).toHaveProperty('status', 'IN_PROGRESS')
  expect(await resolveDelay(updateIssueAssignee(1, { id: 7 }))).toHaveProperty('assignee', { id: 7 })
  expect(await resolveDelay(updateIssueAssignee(1, null))).toHaveProperty('assignee', null)
})
