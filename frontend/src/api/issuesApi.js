import apiClient from './client'
import { USE_MOCK_API } from '../config/apiConfig'
import { mockIssues } from './mockData'

// Anticipa gli endpoint dedicati alle issue mantenendo la stessa forma tra mock e backend.
function delay(data) {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(data), 250)
  })
}

export async function getIssues(projectId) {
  if (USE_MOCK_API) {
    const items = projectId
      ? mockIssues.filter((issue) => issue.project.id === Number(projectId))
      : mockIssues

    return delay({
      items,
      totalCount: items.length,
    })
  }

  const { data } = projectId
    ? await apiClient.get(`/projects/${projectId}/issues`)
    : await apiClient.get('/issues')
  return data
}

export async function getIssueById(issueId) {
  if (USE_MOCK_API) {
    const issue = mockIssues.find((item) => item.id === Number(issueId)) || null
    return delay(issue)
  }

  const { data } = await apiClient.get(`/issues/${issueId}`)
  return data
}

export async function createIssue(payload) {
  if (USE_MOCK_API) {
    return delay({
      id: Date.now(),
      code: `BUG-26-${mockIssues.length + 1}`,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...payload,
    })
  }

  const { data } = await apiClient.post('/issues', payload)
  return data
}

export async function updateIssueStatus(issueId, payload) {
  if (USE_MOCK_API) {
    return delay({
      issueId,
      ...payload,
    })
  }

  const { data } = await apiClient.patch(`/issues/${issueId}/status`, payload)
  return data
}
