import axios from 'axios'
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
export const apiClient = axios.create({ baseURL: apiBaseUrl, headers: { 'Content-Type': 'text/plain;charset=utf-8' } })
export function assertApiConfigured() { if (!apiBaseUrl) throw new Error('The Apps Script API URL is missing. Add VITE_API_BASE_URL to .env.local.') }
