// Verifica che la demo mantenga separati account e membership anche passando tra schermate diverse.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { createUser, getUsers } from '../src/api/usersApi'
import { createProject } from '../src/api/projectsApi'
import { addExistingUserToProject, getProjectMembers, removeUserFromProject } from '../src/api/projectMembersApi'

vi.mock('../src/api/client', () => ({ default: {} }))
vi.mock('../src/config/apiConfig', () => ({ USE_MOCK_API: true }))
vi.mock('../src/api/mockData', () => {
  const admin = { id: 1, fullName: 'Administrator', email: 'admin@example.test', role: 'ADMIN' }
  return { mockUser: admin, mockUsers: [admin], mockProjectMembers: [], mockProjects: [] }
})

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

// Completa il ritardo delle API simulate senza attendere il tempo reale.
async function resolveDelay(promise) {
  await vi.advanceTimersByTimeAsync(300)
  return promise
}

// Verifica creazione account e progetto, aggiunta al team e rimozione senza cancellare l'account.
test('keeps a created account available independently from project membership', async () => {
  const account = await resolveDelay(createUser({ fullName: ' New user ', email: 'NEW@example.test', password: 'Password123!', role: 'USER' }))
  expect(account).toMatchObject({ fullName: 'New user', email: 'new@example.test', role: 'USER' })
  expect(account).not.toHaveProperty('password')
  expect((await resolveDelay(getUsers())).items).toContainEqual(account)
  const project = await resolveDelay(createProject({ name: 'New project', description: 'Demo' }))
  const originalMembers = await resolveDelay(getProjectMembers(project.id))
  expect(originalMembers.items.map((member) => member.userId)).toEqual([1])
  await resolveDelay(addExistingUserToProject({ projectId: project.id, userId: account.id }))
  expect((await resolveDelay(getProjectMembers(project.id))).items).toEqual(expect.arrayContaining([expect.objectContaining({ userId: account.id, fullName: account.fullName })]))
  await resolveDelay(removeUserFromProject({ projectId: project.id, userId: account.id }))
  expect((await resolveDelay(getProjectMembers(project.id))).items.map((member) => member.userId)).toEqual([1])
  expect((await resolveDelay(getUsers())).items).toContainEqual(account)
})
