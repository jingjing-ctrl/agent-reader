const COVER_PALETTES = [
  ['#6366f1', '#a78bfa'],
  ['#0ea5e9', '#6366f1'],
  ['#14b8a6', '#3b82f6'],
  ['#f97316', '#f43f5e'],
  ['#ec4899', '#8b5cf6'],
  ['#10b981', '#0d9488'],
  ['#8b5cf6', '#6366f1'],
  ['#06b6d4', '#0284c7'],
]

function hashString(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

export function getCoverStyle(book) {
  const key = book.title || book.fileName || String(book.id)
  const [a, b] = COVER_PALETTES[hashString(key) % COVER_PALETTES.length]
  return { '--cover-a': a, '--cover-b': b }
}

export function getCoverInitial(book) {
  const t = (book.title || book.fileName || '?').trim()
  return t.charAt(0) || '?'
}

export function getReadPercent(book) {
  if (!book.pageCount) return 0
  const idx = book.lastPageIndex ?? 0
  return Math.min(100, Math.round(((idx + 1) / book.pageCount) * 100))
}
