import apiClient from './client'
import { mockProjectMembers } from './mockData'

// Anticipa la gestione dei membri di progetto usando gli stessi DTO previsti dal diagramma.
const useMockApi = import.meta.env.VITE_USE_MOCK_API !== 'false'

function delay(data) {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(data), 200)
  })
}

export async function getProjectMembers(projectId) {
  if (useMockApi) {
    const items = mockProjectMembers.filter((member) => member.projectId === projectId)

    return delay({
      items,
      totalCount: items.length,
    })
  }

  const { data } = await apiClient.get(`/projects/${projectId}/members`)
  return data
}

export async function addExistingUserToProject(payload) {
  if (useMockApi) {
    return delay({
      joinedAt: new Date().toISOString(),
      ...payload,
    })
  }

  const { data } = await apiClient.post(`/projects/${payload.projectId}/members`, payload)
  return data
}

export async function removeUserFromProject(payload) {
  if (useMockApi) {
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
