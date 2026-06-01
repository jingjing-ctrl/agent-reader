import { computed, reactive, ref, watch } from 'vue'
import { translateBatchToEnglish, formatDeepSeekError } from '../utils/deepseek'
import { isTextBlock } from '../utils/epub'

const READING_VIEW_MODE_KEY = 'agent-reader-reading-view-mode'
const TRANSLATIONS_PREFIX = 'agent-reader-translations-'
/** 与书籍正文缓存版本一致，升级解析结构后需同步递增以丢弃旧译文 */
const TRANSLATIONS_CONTENT_VERSION = 9
const BATCH_SIZE = 6
const FLUSH_DELAY_MS = 80

export const READING_VIEW_MODES = [
  { value: 'original', label: '原文' },
  { value: 'bilingual', label: '双语' },
]

const DEFAULT_READING_VIEW_MODE = 'original'

function isReadingViewMode(value) {
  return READING_VIEW_MODES.some((m) => m.value === value)
}

function readReadingViewMode() {
  try {
    const stored = localStorage.getItem(READING_VIEW_MODE_KEY)
    if (stored === 'chinese') return 'original'
    if (isReadingViewMode(stored)) return stored
  } catch {
    /* ignore */
  }
  return DEFAULT_READING_VIEW_MODE
}

function persistReadingViewMode(mode) {
  try {
    localStorage.setItem(READING_VIEW_MODE_KEY, mode)
  } catch {
    /* ignore */
  }
}

function translationsStorageKey(bookId) {
  return `${TRANSLATIONS_PREFIX}${bookId}-v${TRANSLATIONS_CONTENT_VERSION}`
}

function readBookTranslations(bookId) {
  try {
    const raw = localStorage.getItem(translationsStorageKey(bookId))
    if (!raw) return {}
    const data = JSON.parse(raw)
    return data && typeof data === 'object' ? data : {}
  } catch {
    return {}
  }
}

function saveBookTranslations(bookId, map) {
  try {
    localStorage.setItem(translationsStorageKey(bookId), JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

export function useBilingualReader({
  booksStore,
  settings,
  translations,
  translationErrors,
  translating,
  getBookId,
  requireApiKey,
}) {
  const readingViewMode = ref(readReadingViewMode())
  const bilingualProgress = reactive({ done: 0, total: 0, running: false })
  let runToken = 0
  let flushTimer = null
  const pendingQueue = new Map()

  const needsTranslation = computed(() => readingViewMode.value === 'bilingual')

  function clearTranslationState() {
    for (const key of Object.keys(translations)) delete translations[key]
    for (const key of Object.keys(translationErrors)) delete translationErrors[key]
    for (const key of Object.keys(translating)) delete translating[key]
  }

  function loadBookTranslations(bookId) {
    clearTranslationState()
    if (!bookId) return
    const cached = readBookTranslations(bookId)
    for (const [id, text] of Object.entries(cached)) {
      if (text) translations[id] = text
    }
  }

  function persistTranslation(bookId, paragraphId, text) {
    if (!bookId || !paragraphId || !text) return
    const cached = readBookTranslations(bookId)
    cached[paragraphId] = text
    saveBookTranslations(bookId, cached)
  }

  function allParagraphs() {
    return booksStore.pages.flat().filter(isTextBlock)
  }

  function countTranslated() {
    return allParagraphs().filter((p) => translations[p.id] && !translationErrors[p.id]).length
  }

  function syncRunningState() {
    bilingualProgress.running =
      pendingQueue.size > 0 || Object.keys(translating).length > 0
  }

  function updateProgress() {
    bilingualProgress.total = allParagraphs().length
    bilingualProgress.done = countTranslated()
    syncRunningState()
  }

  function clearPendingQueue() {
    pendingQueue.clear()
    if (flushTimer) {
      clearTimeout(flushTimer)
      flushTimer = null
    }
  }

  async function translateBatch(bookId, batch, token) {
    const pending = batch.filter(
      (p) => !translations[p.id] && !translationErrors[p.id] && !translating[p.id]
    )
    if (!pending.length || token !== runToken || !needsTranslation.value) return

    for (const p of pending) translating[p.id] = true
    syncRunningState()

    try {
      const result = await translateBatchToEnglish(
        settings.deepseekApiKey,
        pending.map((p) => ({ id: p.id, text: p.text }))
      )

      if (token !== runToken || !needsTranslation.value) return

      for (const p of pending) {
        const text = result[p.id]
        if (text) {
          translations[p.id] = text
          delete translationErrors[p.id]
          persistTranslation(bookId, p.id, text)
        } else if (token === runToken) {
          translationErrors[p.id] = '翻译失败：未返回该段落译文'
        }
      }
    } catch (err) {
      if (token !== runToken || !needsTranslation.value) return
      const message = formatDeepSeekError(err, '翻译')
      for (const p of pending) {
        translationErrors[p.id] = message
      }
    } finally {
      for (const p of pending) delete translating[p.id]
      if (token === runToken) updateProgress()
    }
  }

  async function flushPendingQueue() {
    flushTimer = null
    if (!needsTranslation.value || pendingQueue.size === 0) {
      syncRunningState()
      return
    }

    const bookId = getBookId()
    if (!bookId) return

    const token = runToken
    const batch = [...pendingQueue.values()]
      .filter(
        (p) =>
          !translations[p.id] && !translationErrors[p.id] && !translating[p.id]
      )
      .slice(0, BATCH_SIZE)

    for (const p of batch) pendingQueue.delete(p.id)
    if (!batch.length) {
      syncRunningState()
      return
    }

    bilingualProgress.running = true
    await translateBatch(bookId, batch, token)

    if (token !== runToken || !needsTranslation.value) return

    if (pendingQueue.size > 0) {
      scheduleFlush()
    } else {
      syncRunningState()
    }
  }

  function scheduleFlush() {
    if (flushTimer) return
    flushTimer = setTimeout(flushPendingQueue, FLUSH_DELAY_MS)
  }

  function requestLazyTranslation(paragraph) {
    if (!needsTranslation.value || !isTextBlock(paragraph)) return
    if (
      translations[paragraph.id] ||
      translationErrors[paragraph.id] ||
      translating[paragraph.id] ||
      pendingQueue.has(paragraph.id)
    ) {
      return
    }

    pendingQueue.set(paragraph.id, paragraph)
    updateProgress()
    scheduleFlush()
  }

  function stopFullTranslation() {
    runToken += 1
    clearPendingQueue()
    clearTranslatingFlags()
    bilingualProgress.running = false
  }

  function clearTranslatingFlags() {
    for (const key of Object.keys(translating)) delete translating[key]
  }

  async function setReadingViewMode(mode) {
    if (!isReadingViewMode(mode) || readingViewMode.value === mode) return

    if (mode !== 'original' && !requireApiKey()) return

    stopFullTranslation()

    readingViewMode.value = mode
    persistReadingViewMode(mode)

    if (mode === 'original') return

    updateProgress()
  }

  watch(
    () => booksStore.pages.length,
    (len) => {
      if (!len || !needsTranslation.value) return
      updateProgress()
    }
  )

  return {
    readingViewMode,
    readingViewModes: READING_VIEW_MODES,
    needsTranslation,
    bilingualProgress,
    loadBookTranslations,
    persistTranslation,
    setReadingViewMode,
    requestLazyTranslation,
    stopFullTranslation,
    updateProgress,
  }
}
