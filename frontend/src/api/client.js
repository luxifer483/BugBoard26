import axios from 'axios'
import { API_BASE_URL, DEFAULT_HEADERS } from '../config/apiConfig'

// Client HTTP condiviso da tutti i moduli API.
// Usa la base URL configurata via env e imposta JSON come formato di default.
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: DEFAULT_HEADERS,
})

export default apiClient
