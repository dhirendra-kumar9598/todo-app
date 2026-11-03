// Anonymous per-browser id sent as X-Client-Id; the API scopes every task to it.
const KEY = 'todo:client-id'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const uuid = () =>
  crypto.randomUUID?.() ??
  '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
    (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16),
  )

let cached

export function getClientId() {
  if (cached) return cached
  try {
    const stored = localStorage.getItem(KEY)
    cached = stored && UUID.test(stored) ? stored : uuid()
    localStorage.setItem(KEY, cached)
  } catch {
    // Storage blocked (private mode etc.): keep an id for this session only.
    cached ??= uuid()
  }
  return cached
}
