import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  detectBookFormat,
  isSupportedBookFile,
  parseBookFromArrayBuffer,
  paginateParagraphs,
} from '../utils/bookImport'
import {
  saveBookContent,
  loadBookContent,
  saveBookFile,
  loadBookFile,
  deleteBookData,
} from '../utils/bookStorage'

const BOOKS_STORAGE = 'agent-reader-books-v2'
const GROUPS_STORAGE = 'agent-reader-library-groups-v1'
const SESSION_STORAGE = 'agent-reader-last-session'

export const LIBRARY_FILTER_ALL = 'all'
export const LIBRARY_FILTER_UNGROUPED = 'ungrouped'

const contentCache = new Map()

function normalizeStoredContent(data) {
  if (!data?.paragraphs?.length) return null
  const paragraphs = data.paragraphs
  const pages =
    data.pages?.length > 0 ? data.pages : paginateParagraphs(paragraphs)
  return { paragraphs, pages }
}

function packContentForStorage(paragraphs) {
  return { v: 2, paragraphs }
}

function saveLastSession(bookId, pageIndex) {
  try {
    localStorage.setItem(
      SESSION_STORAGE,
      JSON.stringify({ bookId, pageIndex, at: Date.now() })
    )
  } catch {
    /* ignore */
  }
}

function loadLastSession() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE)
    if (!raw) return null
    const s = JSON.parse(raw)
    if (s?.bookId) return s
  } catch {
    /* ignore */
  }
  return null
}

function loadBooksFromStorage() {
  try {
    const raw = localStorage.getItem(BOOKS_STORAGE)
    if (!raw) return []
    const list = JSON.parse(raw)
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function saveBooksToStorage(books) {
  const slim = books.map((b) => ({
    id: b.id,
    title: b.title,
    fileName: b.fileName,
    addedAt: b.addedAt,
    lastPageIndex: b.lastPageIndex ?? 0,
    pageCount: b.pageCount ?? 0,
    groupId: b.groupId || null,
  }))
  localStorage.setItem(BOOKS_STORAGE, JSON.stringify(slim))
}

function loadGroupsFromStorage() {
  try {
    const raw = localStorage.getItem(GROUPS_STORAGE)
    if (!raw) return []
    const list = JSON.parse(raw)
    if (!Array.isArray(list)) return []
    return list
      .filter((g) => g?.id && g?.name)
      .map((g, i) => ({
        id: g.id,
        name: String(g.name).trim(),
        sortOrder: Number.isFinite(g.sortOrder) ? g.sortOrder : i,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder)
  } catch {
    return []
  }
}

function saveGroupsToStorage(groups) {
  localStorage.setItem(GROUPS_STORAGE, JSON.stringify(groups))
}

function cacheContent(id, paragraphs, pages) {
  contentCache.set(id, { paragraphs, pages })
}

export const useBooksStore = defineStore('books', () => {
  const books = ref(
    loadBooksFromStorage().map((b) => ({
      ...b,
      groupId: b.groupId || null,
    }))
  )
  const groups = ref(loadGroupsFromStorage())
  const currentBookId = ref(null)
  const pages = ref([])
  const currentPageIndex = ref(0)
  const parsing = ref(false)
  const hydratingId = ref(null)
  const pendingNavigationBookId = ref(null)

  function persist() {
    try {
      saveBooksToStorage(books.value)
    } catch (err) {
      console.warn('书架元数据保存失败:', err)
    }
  }

  function getBookMeta(id) {
    return books.value.find((b) => b.id === id) ?? null
  }

  function getGroup(id) {
    return groups.value.find((g) => g.id === id) ?? null
  }

  function getGroupName(groupId) {
    if (!groupId) return ''
    return getGroup(groupId)?.name ?? ''
  }

  function countBooksInFilter(filterId) {
    if (filterId === LIBRARY_FILTER_ALL) return books.value.length
    if (filterId === LIBRARY_FILTER_UNGROUPED) {
      return books.value.filter((b) => !b.groupId).length
    }
    return books.value.filter((b) => b.groupId === filterId).length
  }

  function getBooksForFilter(filterId) {
    if (filterId === LIBRARY_FILTER_ALL) return books.value
    if (filterId === LIBRARY_FILTER_UNGROUPED) {
      return books.value.filter((b) => !b.groupId)
    }
    return books.value.filter((b) => b.groupId === filterId)
  }

  function createGroup(name) {
    const trimmed = name?.trim()
    if (!trimmed) throw new Error('分组名称不能为空')
    if (groups.value.some((g) => g.name === trimmed)) {
      throw new Error('已存在同名分组')
    }
    const group = {
      id: 'grp-' + Date.now(),
      name: trimmed,
      sortOrder: groups.value.length,
    }
    groups.value.push(group)
    saveGroupsToStorage(groups.value)
    return group
  }

  function renameGroup(id, name) {
    const trimmed = name?.trim()
    if (!trimmed) throw new Error('分组名称不能为空')
    const group = getGroup(id)
    if (!group) throw new Error('分组不存在')
    if (groups.value.some((g) => g.id !== id && g.name === trimmed)) {
      throw new Error('已存在同名分组')
    }
    group.name = trimmed
    saveGroupsToStorage(groups.value)
  }

  function deleteGroup(id) {
    books.value.forEach((b) => {
      if (b.groupId === id) b.groupId = null
    })
    groups.value = groups.value.filter((g) => g.id !== id)
    saveGroupsToStorage(groups.value)
    persist()
  }

  function setBookGroup(bookId, groupId) {
    const meta = getBookMeta(bookId)
    if (!meta) return
    if (groupId && !getGroup(groupId)) {
      throw new Error('分组不存在')
    }
    meta.groupId = groupId || null
    persist()
  }

  function setBooksGroup(bookIds, groupId) {
    if (groupId && !getGroup(groupId)) {
      throw new Error('分组不存在')
    }
    let changed = false
    bookIds.forEach((id) => {
      const meta = getBookMeta(id)
      if (!meta) return
      meta.groupId = groupId || null
      changed = true
    })
    if (changed) persist()
  }

  function getGroupMoveOptions(excludeGroupId) {
    return [
      { id: null, name: '未分组' },
      ...groups.value.map((g) => ({ id: g.id, name: g.name })),
    ].filter((opt) => opt.id !== excludeGroupId)
  }

  function removeBooks(bookIds) {
    ;[...bookIds].forEach((id) => removeBook(id))
  }

  function getBook(id) {
    const meta = getBookMeta(id)
    if (!meta) return null
    const cached = contentCache.get(id)
    if (!cached) {
      return { ...meta, paragraphs: [], pages: [] }
    }
    return { ...meta, paragraphs: cached.paragraphs, pages: cached.pages }
  }

  async function loadContentFromFile(id) {
    const fileRec = await loadBookFile(id)
    if (!fileRec?.buffer) return false

    const meta = getBookMeta(id)
    const fileName = fileRec.fileName || meta?.fileName || 'book.epub'
    const format =
      fileRec.format || meta?.format || detectBookFormat(fileName) || 'epub'
    const { paragraphs } = await parseBookFromArrayBuffer(
      fileRec.buffer,
      fileName,
      format
    )
    if (!paragraphs.length) return false

    const pageList = paginateParagraphs(paragraphs)
    cacheContent(id, paragraphs, pageList)

    if (meta) {
      meta.pageCount = pageList.length
      persist()
    }

    saveBookContent(id, packContentForStorage(paragraphs)).catch(() => {})
    return true
  }

  async function ensureContent(id) {
    if (contentCache.has(id)) return true

    try {
      const raw = await loadBookContent(id)
      const normalized = normalizeStoredContent(raw)
      if (normalized) {
        cacheContent(id, normalized.paragraphs, normalized.pages)
        const meta = getBookMeta(id)
        if (meta && meta.pageCount !== normalized.pages.length) {
          meta.pageCount = normalized.pages.length
          persist()
        }
        return true
      }
    } catch (err) {
      console.warn('加载缓存正文失败:', err)
    }

    hydratingId.value = id
    try {
      return await loadContentFromFile(id)
    } catch (err) {
      console.warn('从 EPUB 文件恢复正文失败:', err)
      return false
    } finally {
      if (hydratingId.value === id) hydratingId.value = null
    }
  }

  function clampPageIndex(meta, index) {
    const maxIdx = Math.max(0, (meta.pageCount ?? 1) - 1)
    return Math.min(Math.max(0, index ?? 0), maxIdx)
  }

  function openBookMeta(id) {
    const meta = getBookMeta(id)
    if (!meta) return false
    currentBookId.value = id
    pages.value = []
    currentPageIndex.value = clampPageIndex(meta, meta.lastPageIndex)
    return true
  }

  function markPendingNavigation(id) {
    pendingNavigationBookId.value = id
  }

  function clearPendingNavigation() {
    pendingNavigationBookId.value = null
  }

  function isPendingNavigation(id) {
    return pendingNavigationBookId.value === id
  }

  async function addBookFromFile(file, options = {}) {
    const format = detectBookFormat(file)
    if (!format || !isSupportedBookFile(file)) {
      throw new Error('仅支持 EPUB 与 PDF 格式')
    }
    parsing.value = true
    try {
      const arrayBuffer = await file.arrayBuffer()
      const existing = books.value.find((b) => b.fileName === file.name)
      const id = existing?.id ?? 'book-' + Date.now()

      await saveBookFile(id, {
        buffer: arrayBuffer,
        fileName: file.name,
        format,
        savedAt: Date.now(),
      })

      const { title, paragraphs } = await parseBookFromArrayBuffer(
        arrayBuffer,
        file.name,
        format
      )
      if (!paragraphs.length) {
        throw new Error('未能从电子书中解析出文本内容')
      }

      const pageList = paginateParagraphs(paragraphs)
      cacheContent(id, paragraphs, pageList)

      try {
        await saveBookContent(id, packContentForStorage(paragraphs))
      } catch {
        /* 段落缓存失败不影响，已有原文件 */
      }

      const assignGroupId =
        options.groupId &&
        options.groupId !== LIBRARY_FILTER_ALL &&
        options.groupId !== LIBRARY_FILTER_UNGROUPED &&
        getGroup(options.groupId)
          ? options.groupId
          : null

      if (existing) {
        existing.title = title || existing.title
        existing.format = format
        existing.pageCount = pageList.length
        if (existing.lastPageIndex >= pageList.length) {
          existing.lastPageIndex = 0
        }
        if (assignGroupId) existing.groupId = assignGroupId
        persist()
      } else {
        const meta = {
          id,
          title:
            title || file.name.replace(/\.(epub|pdf)$/i, ''),
          fileName: file.name,
          format,
          addedAt: Date.now(),
          lastPageIndex: 0,
          pageCount: pageList.length,
          groupId: assignGroupId,
        }
        books.value.unshift(meta)
        persist()
      }

      const meta = getBookMeta(id)
      saveLastSession(id, meta?.lastPageIndex ?? 0)
      return getBook(id)
    } finally {
      parsing.value = false
    }
  }

  function openBook(id, pageIndex) {
    const book = getBook(id)
    if (!book?.pages?.length) return false
    const meta = getBookMeta(id)
    currentBookId.value = id
    pages.value = book.pages
    const idx = pageIndex ?? book.lastPageIndex ?? 0
    currentPageIndex.value = clampPageIndex(
      { pageCount: book.pages.length, ...meta },
      idx
    )
    saveReadingProgress()
    return true
  }

  function goToPage(index) {
    if (index < 0 || index >= pages.value.length) return
    currentPageIndex.value = index
    saveReadingProgress()
  }

  function saveReadingProgress() {
    const meta = books.value.find((b) => b.id === currentBookId.value)
    if (!meta) return
    meta.lastPageIndex = currentPageIndex.value
    if (pages.value.length) {
      meta.pageCount = pages.value.length
    }
    persist()
    saveLastSession(currentBookId.value, currentPageIndex.value)
  }

  function removeBook(id) {
    contentCache.delete(id)
    deleteBookData(id).catch((err) => {
      console.warn('删除本地书籍数据失败:', err)
    })
    books.value = books.value.filter((b) => b.id !== id)
    persist()
    if (currentBookId.value === id) {
      currentBookId.value = null
      pages.value = []
      currentPageIndex.value = 0
    }
  }

  function nextPage() {
    if (currentPageIndex.value < pages.value.length - 1) {
      currentPageIndex.value++
      saveReadingProgress()
      return true
    }
    return false
  }

  function prevPage() {
    if (currentPageIndex.value > 0) {
      currentPageIndex.value--
      saveReadingProgress()
      return true
    }
    return false
  }

  function hasContent(id) {
    return contentCache.has(id)
  }

  const currentBook = () => getBook(currentBookId.value)

  async function restoreLastSession() {
    const session = loadLastSession()
    if (!session?.bookId || !getBookMeta(session.bookId)) return null
    await ensureContent(session.bookId)
    if (openBook(session.bookId, session.pageIndex)) {
      return session.bookId
    }
    openBookMeta(session.bookId)
    return session.bookId
  }

  return {
    books,
    groups,
    currentBookId,
    pages,
    currentPageIndex,
    parsing,
    hydratingId,
    pendingNavigationBookId,
    addBookFromFile,
    getBook,
    getBookMeta,
    getGroup,
    getGroupName,
    countBooksInFilter,
    getBooksForFilter,
    createGroup,
    renameGroup,
    deleteGroup,
    setBookGroup,
    setBooksGroup,
    getGroupMoveOptions,
    removeBooks,
    ensureContent,
    openBookMeta,
    openBook,
    removeBook,
    nextPage,
    prevPage,
    goToPage,
    hasContent,
    markPendingNavigation,
    clearPendingNavigation,
    isPendingNavigation,
    currentBook,
    loadLastSession,
    restoreLastSession,
  }
})
