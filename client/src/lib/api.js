import { getClientId } from './clientId'
import { TIME_ZONE } from './dates'

const BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message)
    this.status = status
    this.details = details
  }
}

async function request(path, { method = 'GET', body, params, signal, raw = false } = {}) {
  const query = params
    ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== ''))
    : ''

  let res
  try {
    res = await fetch(`${BASE_URL}${path}${query}`, {
      method,
      signal,
      headers: {
        'X-Client-Id': getClientId(),
        ...(body && { 'Content-Type': 'application/json' }),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new ApiError('Cannot reach the server. Check your connection.', 0)
  }

  if (res.status === 204) return null

  // A non-JSON reply usually means the request never reached the API (e.g. VITE_API_URL
  // is unset on the host and /api/* fell through to index.html).
  const isJson = res.headers.get('content-type')?.includes('application/json')
  const json = isJson ? await res.json().catch(() => null) : null
  if (!json) {
    throw new ApiError(
      res.ok ? 'Unexpected response from the server. Is the API URL configured?' : `Request failed (${res.status})`,
      res.status,
    )
  }
  if (!res.ok) {
    throw new ApiError(json.error?.message || res.statusText, res.status, json.error?.details)
  }
  return raw ? json : json.data
}

const iso = (d) => (d ? new Date(d).toISOString() : undefined)

export const api = {
  listTasks: ({ from, to, ...rest } = {}, signal) =>
    request('/tasks', { params: { from: iso(from), to: iso(to), ...rest }, signal }),
  searchTasks: async (q, signal) => {
    const { data, meta } = await request('/tasks/search', { params: { q }, signal, raw: true })
    return { tasks: data, hasMore: Boolean(meta?.hasMore) }
  },
  weekSummary: (date, signal) =>
    request('/tasks/summary', { params: { date: iso(date), tz: TIME_ZONE }, signal }),
  listWeeks: (signal) => request('/tasks/weeks', { params: { tz: TIME_ZONE }, signal }),
  getTask: (id, signal) => request(`/tasks/${id}`, { signal }),
  createTask: (body) => request('/tasks', { method: 'POST', body }),
  updateTask: (id, body) => request(`/tasks/${id}`, { method: 'PATCH', body }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
}
