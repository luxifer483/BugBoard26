export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'

export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
}

export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== 'false'
