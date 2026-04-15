import apiClient from './client'
import { USE_MOCK_API } from '../config/apiConfig'
import { mockComments } from './mockData'

// Gestisce il recupero e la creazione dei commenti legati a una issue.
function delay(data) {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(data), 200)
  })
}

export async function getComments(issueId) {
  if (USE_MOCK_API) {
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
  if (USE_MOCK_API) {
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
