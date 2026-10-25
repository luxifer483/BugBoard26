import apiClient from './client'
import { USE_MOCK_API } from '../config/apiConfig'
import { mockProjectMembers, mockUsers } from './mockData'

// Anticipa la gestione dei membri di progetto usando gli stessi DTO previsti dal diagramma.
function delay(data) {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(data), 200)
  })
}

export async function getProjectMembers(projectId) {
  if (USE_MOCK_API) {
    const items = mockProjectMembers.filter((member) => member.projectId === Number(projectId))
      .map((member) => ({ ...mockUsers.find((user) => user.id === member.userId), ...member }))

    return delay({
      items,
      totalCount: items.length,
    })
  }

  const { data } = await apiClient.get(`/projects/${projectId}/members`)
  return data
}

export async function addExistingUserToProject(payload) {
  if (USE_MOCK_API) {
    const user = mockUsers.find((item) => item.id === payload.userId)
    const member = {
      joinedAt: new Date().toISOString(),
      projectId: payload.projectId,
      userId: payload.userId,
      fullName: user?.fullName,
      email: user?.email,
      role: user?.role,
    }
    mockProjectMembers.push(member)
    return delay(member)
  }

  const { data } = await apiClient.post(`/projects/${payload.projectId}/members`, { userId: payload.userId })
  return data
}

export async function removeUserFromProject(payload) {
  if (USE_MOCK_API) {
    const index = mockProjectMembers.findIndex((member) => member.projectId === payload.projectId && member.userId === payload.userId)
    if (index !== -1) mockProjectMembers.splice(index, 1)
    return delay({
      removed: true,
      ...payload,
    })
  }

  const { data } = await apiClient.delete(
    `/projects/${payload.projectId}/members/${payload.userId}`,
  )
  return data
}
