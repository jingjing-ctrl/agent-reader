import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  useBooksStore,
  LIBRARY_FILTER_ALL,
  LIBRARY_FILTER_UNGROUPED,
} from '../stores/books'
import { useToast } from './useToast'
import {
  LIBRARY_GROUP_KEY,
  LIBRARY_PAGE_KEY,
  LIBRARY_PAGE_SIZE,
  readSessionInt,
  readSessionString,
  writeSession,
} from '../utils/libraryStorage'

export function useLibraryPage() {
  const router = useRouter()
  const booksStore = useBooksStore()
  const toast = useToast()

  const fileInput = ref(null)
  const scrollEl = ref(null)
  const error = ref('')

  const activeFilter = ref(readSessionString(LIBRARY_GROUP_KEY, LIBRARY_FILTER_ALL))
  const currentPage = ref(readSessionInt(LIBRARY_PAGE_KEY, 1))

  const showGroupPanel = ref(false)
  const newGroupName = ref('')
  const editingGroupId = ref(null)
  const editingGroupName = ref('')

  const openGroupMenuId = ref(null)
  const batchMode = ref(false)
  const selectedIds = ref(new Set())
  const showBatchMoveMenu = ref(false)

  const bookCount = computed(() => booksStore.books.length)

  const filterTabs = computed(() => {
    const tabs = [
      {
        id: LIBRARY_FILTER_ALL,
        name: '全部',
        count: booksStore.countBooksInFilter(LIBRARY_FILTER_ALL),
      },
      {
        id: LIBRARY_FILTER_UNGROUPED,
        name: '未分组',
        count: booksStore.countBooksInFilter(LIBRARY_FILTER_UNGROUPED),
      },
    ]
    booksStore.groups.forEach((g) => {
      tabs.push({
        id: g.id,
        name: g.name,
        count: booksStore.countBooksInFilter(g.id),
      })
    })
    return tabs
  })

  const activeFilterLabel = computed(
    () => filterTabs.value.find((t) => t.id === activeFilter.value)?.name ?? '全部'
  )

  const filteredBooks = computed(() => booksStore.getBooksForFilter(activeFilter.value))

  const totalPages = computed(() =>
    Math.max(1, Math.ceil(filteredBooks.value.length / LIBRARY_PAGE_SIZE))
  )

  const pagedBooks = computed(() => {
    const start = (currentPage.value - 1) * LIBRARY_PAGE_SIZE
    return filteredBooks.value.slice(start, start + LIBRARY_PAGE_SIZE)
  })

  const selectedCount = computed(() => selectedIds.value.size)

  const isPageFullySelected = computed(
    () =>
      pagedBooks.value.length > 0 &&
      pagedBooks.value.every((b) => selectedIds.value.has(b.id))
  )

  const isFilterFullySelected = computed(
    () =>
      filteredBooks.value.length > 0 &&
      filteredBooks.value.every((b) => selectedIds.value.has(b.id))
  )

  const batchMoveOptions = computed(() => booksStore.getGroupMoveOptions())

  function clampCurrentPage() {
    if (currentPage.value > totalPages.value) {
      currentPage.value = totalPages.value
      writeSession(LIBRARY_PAGE_KEY, currentPage.value)
    }
  }

  function syncActiveFilter() {
    const validIds = new Set(filterTabs.value.map((t) => t.id))
    if (!validIds.has(activeFilter.value)) {
      activeFilter.value = LIBRARY_FILTER_ALL
    }
  }

  function clearSelection() {
    selectedIds.value = new Set()
  }

  function closeMenus() {
    openGroupMenuId.value = null
    showBatchMoveMenu.value = false
  }

  watch(() => booksStore.books.length, clampCurrentPage)
  watch(currentPage, (p) => writeSession(LIBRARY_PAGE_KEY, p))

  watch(activeFilter, (id) => {
    writeSession(LIBRARY_GROUP_KEY, id)
    currentPage.value = 1
    writeSession(LIBRARY_PAGE_KEY, 1)
    clearSelection()
  })

  watch(batchMode, (on) => {
    if (!on) clearSelection()
  })

  watch(() => [booksStore.groups.length, filteredBooks.value.length], () => {
    syncActiveFilter()
    clampCurrentPage()
  })

  onMounted(() => {
    syncActiveFilter()
    const savedFilter = readSessionString(LIBRARY_GROUP_KEY, LIBRARY_FILTER_ALL)
    const validIds = new Set(filterTabs.value.map((t) => t.id))
    activeFilter.value = validIds.has(savedFilter) ? savedFilter : LIBRARY_FILTER_ALL

    const savedPage = readSessionInt(LIBRARY_PAGE_KEY, 1)
    currentPage.value = Math.min(Math.max(1, savedPage), totalPages.value)

    booksStore.hydrateLibraryCovers()
    document.addEventListener('click', closeMenus)
  })

  onUnmounted(() => {
    document.removeEventListener('click', closeMenus)
  })

  function selectFilter(filterId) {
    activeFilter.value = filterId
  }

  function goToPage(page) {
    const p = Math.min(Math.max(1, page), totalPages.value)
    if (p === currentPage.value) return
    currentPage.value = p
    scrollEl.value?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function isBookSelected(bookId) {
    return selectedIds.value.has(bookId)
  }

  function toggleSelectBook(bookId) {
    const next = new Set(selectedIds.value)
    if (next.has(bookId)) next.delete(bookId)
    else next.add(bookId)
    selectedIds.value = next
  }

  function toggleBatchMode() {
    batchMode.value = !batchMode.value
    if (!batchMode.value) {
      clearSelection()
      showBatchMoveMenu.value = false
    }
  }

  function toggleSelectPage() {
    const next = new Set(selectedIds.value)
    if (isPageFullySelected.value) {
      pagedBooks.value.forEach((b) => next.delete(b.id))
    } else {
      pagedBooks.value.forEach((b) => next.add(b.id))
    }
    selectedIds.value = next
  }

  function toggleSelectFilter() {
    selectedIds.value = isFilterFullySelected.value
      ? new Set()
      : new Set(filteredBooks.value.map((b) => b.id))
  }

  function batchDelete() {
    if (selectedCount.value === 0) return
    const ids = [...selectedIds.value]
    toast.showBatchDeleteConfirm(ids.length, () => {
      booksStore.removeBooks(ids)
      clearSelection()
      batchMode.value = false
    })
  }

  function batchMoveTo(groupId) {
    if (selectedCount.value === 0) return
    const ids = [...selectedIds.value]
    booksStore.setBooksGroup(ids, groupId)
    const name = groupId ? booksStore.getGroupName(groupId) : '未分组'
    toast.showSuccess(`已将 ${ids.length} 本移至「${name}」`)
    clearSelection()
    showBatchMoveMenu.value = false
  }

  function toggleBatchMoveMenu(e) {
    e?.stopPropagation()
    showBatchMoveMenu.value = !showBatchMoveMenu.value
  }

  function toggleGroupPanel() {
    showGroupPanel.value = !showGroupPanel.value
    if (!showGroupPanel.value) cancelEditGroup()
  }

  function createGroup() {
    error.value = ''
    try {
      const group = booksStore.createGroup(newGroupName.value)
      newGroupName.value = ''
      activeFilter.value = group.id
      toast.showSuccess(`已创建分组「${group.name}」`)
    } catch (err) {
      error.value = err.message || '创建分组失败'
    }
  }

  function startEditGroup(group) {
    editingGroupId.value = group.id
    editingGroupName.value = group.name
  }

  function cancelEditGroup() {
    editingGroupId.value = null
    editingGroupName.value = ''
  }

  function saveEditGroup() {
    error.value = ''
    try {
      booksStore.renameGroup(editingGroupId.value, editingGroupName.value)
      cancelEditGroup()
      toast.showSuccess('分组已重命名')
    } catch (err) {
      error.value = err.message || '重命名失败'
    }
  }

  function removeGroup(group) {
    toast.showGroupDeleteConfirm(group, () => {
      const wasActive = activeFilter.value === group.id
      booksStore.deleteGroup(group.id)
      if (wasActive) activeFilter.value = LIBRARY_FILTER_UNGROUPED
    })
  }

  function groupOptionsForBook(book) {
    return booksStore.getGroupMoveOptions(book.groupId)
  }

  function toggleBookGroupMenu(e, bookId) {
    e.stopPropagation()
    openGroupMenuId.value = openGroupMenuId.value === bookId ? null : bookId
  }

  function assignBookGroup(e, bookId, groupId) {
    e.stopPropagation()
    booksStore.setBookGroup(bookId, groupId)
    openGroupMenuId.value = null
    toast.showSuccess(groupId ? '已移入分组' : '已移出分组')
  }

  async function goToReader(bookId) {
    if (!booksStore.getBookMeta(bookId)) {
      throw new Error('书籍不存在')
    }
    booksStore.markPendingNavigation(bookId)
    const ok = await booksStore.ensureContent(bookId)
    if (!ok) {
      booksStore.clearPendingNavigation()
      throw new Error('无法加载书籍正文，请删除后重新导入该书籍')
    }
    if (!booksStore.openBook(bookId)) {
      booksStore.clearPendingNavigation()
      throw new Error('打开书籍失败')
    }
    await nextTick()
    await router.replace({ name: 'reader', params: { bookId: String(bookId) } })
    booksStore.clearPendingNavigation()
  }

  function openBook(id) {
    error.value = ''
    writeSession(LIBRARY_PAGE_KEY, currentPage.value)
    goToReader(id).catch((err) => {
      error.value = err.message || '打开失败'
    })
  }

  function handleCardClick(book) {
    if (batchMode.value) {
      toggleSelectBook(book.id)
      return
    }
    openBook(book.id)
  }

  function triggerUpload() {
    fileInput.value?.click()
  }

  async function onFileChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    error.value = ''
    try {
      const { book, isExisting } = await booksStore.addBookFromFile(file, {
        groupId: activeFilter.value,
      })
      if (!book?.id) throw new Error('导入失败，请重试')
      const title = book.title || book.fileName || '书籍'
      if (isExisting) {
        toast.showMessage(`《${title}》该书已导入，无需重复导入`, { type: 'info' })
      } else {
        toast.showSuccess(`《${title}》导入成功`)
        if (currentPage.value !== 1) {
          currentPage.value = 1
          writeSession(LIBRARY_PAGE_KEY, 1)
        }
      }
    } catch (err) {
      booksStore.clearPendingNavigation()
      error.value = err.message || '上传失败'
    }
  }

  function removeBook(e, book) {
    e.stopPropagation()
    toast.showDeleteConfirm(book, () => booksStore.removeBook(book.id))
  }

  return {
    booksStore,
    fileInput,
    scrollEl,
    error,
    activeFilter,
    currentPage,
    showGroupPanel,
    newGroupName,
    editingGroupId,
    editingGroupName,
    openGroupMenuId,
    batchMode,
    showBatchMoveMenu,
    bookCount,
    filterTabs,
    activeFilterLabel,
    filteredBooks,
    totalPages,
    pagedBooks,
    selectedCount,
    isPageFullySelected,
    isFilterFullySelected,
    batchMoveOptions,
    selectFilter,
    goToPage,
    isBookSelected,
    toggleSelectBook,
    toggleBatchMode,
    toggleSelectPage,
    toggleSelectFilter,
    batchDelete,
    batchMoveTo,
    toggleBatchMoveMenu,
    toggleGroupPanel,
    createGroup,
    startEditGroup,
    cancelEditGroup,
    saveEditGroup,
    removeGroup,
    groupOptionsForBook,
    toggleBookGroupMenu,
    assignBookGroup,
    handleCardClick,
    triggerUpload,
    onFileChange,
    removeBook,
  }
}
