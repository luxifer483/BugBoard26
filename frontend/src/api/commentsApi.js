import apiClient from './client'
import { mockComments } from './mockData'

// Gestisce il recupero e la creazione dei commenti legati a una issue.
const useMockApi = import.meta.env.VITE_USE_MOCK_API !== 'false'

function delay(data) {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(data), 200)
  })
}

export async function getComments(issueId) {
  if (useMockApi) {
    const items = mockComments.filter((comment) => comment.issueId === issueId)

    return delay({
      items,
      totalCount: items.length,
    })
  }

  const { data } = await apiClient.get(`/issues/${issueId}/comments`)
  return data
}

export async function createComment(issueId, payload) {
  if (useMockApi) {
    return delay({
      id: Date.now(),
      issueId,
      createdAt: new Date().toISOString(),
      ...payload,
    })
  }

  const { data } = await apiClient.post(`/issues/${issueId}/comments`, payload)
  return data
}
