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
    const createdIssue = {
      id: Date.now(),
      code: `BUG-26-${mockIssues.length + 1}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...payload,
      status: 'TODO',
      priority: payload.priority ?? null,
    }

    mockIssues.unshift(createdIssue)

    return delay(createdIssue)
  }

  const { data } = await apiClient.post('/issues', {
    projectId: payload.project.id,
    title: payload.title,
    description: payload.description,
    type: payload.type,
    priority: payload.priority ?? null,
    assigneeId: payload.assignee?.id ?? null,
  })
  return data
}

export async function updateIssueStatus(issueId, payload) {
  if (USE_MOCK_API) {
    const issue = mockIssues.find((item) => item.id === Number(issueId))
    Object.assign(issue, payload, { updatedAt: new Date().toISOString() })
    return delay(issue)
  }

  const { data } = await apiClient.patch(`/issues/${issueId}/status`, payload)
  return data
}

export async function updateIssueAssignee(issueId, assignee) {
  if (USE_MOCK_API) {
    const issue = mockIssues.find((item) => item.id === Number(issueId))
    Object.assign(issue, { assignee, updatedAt: new Date().toISOString() })
    return delay(issue)
  }
  const { data } = await apiClient.patch(`/issues/${issueId}/assignee`, {
    assigneeId: assignee?.id ?? null,
  })
  return data
}
