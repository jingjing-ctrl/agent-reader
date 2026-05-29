export const LIBRARY_PAGE_KEY = 'agent-reader-library-page'
export const LIBRARY_GROUP_KEY = 'agent-reader-library-group'
export const LIBRARY_PAGE_SIZE = 6

export function readSessionInt(key, fallback = 1) {
  try {
    const n = parseInt(sessionStorage.getItem(key), 10)
    if (Number.isFinite(n) && n >= 1) return n
  } catch {
    /* ignore */
  }
  return fallback
}

export function readSessionString(key, fallback = '') {
  try {
    const v = sessionStorage.getItem(key)
    if (v) return v
  } catch {
    /* ignore */
  }
  return fallback
}

export function writeSession(key, value) {
  sessionStorage.setItem(key, String(value))
}
