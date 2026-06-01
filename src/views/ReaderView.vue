<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppTopBar from '../components/AppTopBar.vue'
import AppModal from '../components/AppModal.vue'
import ReaderLeftSidebar from '../components/ReaderLeftSidebar.vue'
import AiAssistantPanel from '../components/AiAssistantPanel.vue'
import ParagraphBlock from '../components/ParagraphBlock.vue'
import { useBooksStore } from '../stores/books'
import { useSettingsStore } from '../stores/settings'
import {
  analyzeParagraph,
  formatDeepSeekError,
} from '../utils/deepseek'
import { useReaderStream } from '../composables/useReaderStream'
import { useBilingualReader } from '../composables/useBilingualReader'
import { useToast } from '../composables/useToast'
import { findParagraphIdAtIndex, syncActiveTocId } from '../utils/toc'

const route = useRoute()
const router = useRouter()
const booksStore = useBooksStore()
const settings = useSettingsStore()
const { showMessage } = useToast()

const selectedParagraphId = ref(null)
const aiPanelOpen = ref(false)

const translations = reactive({})
const translationErrors = reactive({})
const translating = reactive({})
const analyzingId = ref(null)

const aiState = reactive({
  content: '',
  loading: false,
  error: false,
})

const modal = reactive({
  visible: false,
  title: '',
  content: '',
  loading: false,
  error: false,
  variant: 'default',
})

const restoring = ref(false)
const readerScrollRef = ref(null)

const isRestoring = computed(
  () =>
    restoring.value || booksStore.hydratingId === route.params.bookId
)

const book = computed(() => {
  void booksStore.pages.length
  return booksStore.getBook(route.params.bookId)
})
const contentMissing = computed(
  () =>
    !isRestoring.value &&
    !!book.value &&
    !booksStore.pages.length &&
    !booksStore.hasContent(route.params.bookId)
)
const pageInfo = computed(() => {
  const meta = booksStore.getBookMeta(route.params.bookId)
  const total = booksStore.pages.length || meta?.pageCount || 1
  const current = Math.min(booksStore.currentPageIndex + 1, total)
  return { current, total, percent: Math.round((current / total) * 100) }
})

const selectedParagraph = computed(() => {
  if (!selectedParagraphId.value) return null
  for (const page of booksStore.pages) {
    const found = page.find((p) => p.id === selectedParagraphId.value)
    if (found) return found
  }
  return null
})

const {
  streamPages,
  syncToPage,
  goToPageAtStart,
  restoreReadingPosition,
  captureReadingPosition,
  resetStream,
  onReaderScroll,
  onReaderWheel,
  tryArrowScroll,
  isScrollable,
  atScrollTop,
  atScrollBottom,
  isScrollAnchoring,
} = useReaderStream(booksStore, () => readerScrollRef.value)

async function syncReaderBook() {
  const id = route.params.bookId
  if (!id) {
    router.replace({ name: 'library' })
    return
  }

  if (!booksStore.getBookMeta(id)) {
    router.replace({ name: 'library' })
    return
  }

  const wasPending = booksStore.isPendingNavigation(id)
  if (wasPending) {
    booksStore.clearPendingNavigation()
  }

  resetStream()
  clearReaderAiSession()
  booksStore.setActiveTocId(null)
  restoring.value = true
  try {
    if (!wasPending || !booksStore.pages.length) {
      await booksStore.ensureContent(id)
    }
    if (!booksStore.openBook(id)) {
      booksStore.openBookMeta(id)
    }
    loadBookTranslations(id)
    if (needsTranslation.value) {
      updateProgress()
    }
  } finally {
    restoring.value = false
    await nextTick()
    const { pageIndex, paragraphId } = booksStore.getLastReadingPosition(id)
    restoreReadingPosition(pageIndex, paragraphId)
    await nextTick()
    const toc = booksStore.getBook(id)?.toc
    if (toc?.length) {
      booksStore.setActiveTocId(
        syncActiveTocId(toc, booksStore.pages, pageIndex, paragraphId)
      )
    }
  }
}

function saveProgressBeforeLeave() {
  if (!booksStore.currentBookId || !booksStore.pages.length) return
  const pos = captureReadingPosition(readerScrollRef.value)
  if (pos) {
    booksStore.saveReadingPosition(pos.pageIndex, pos.paragraphId)
  } else {
    booksStore.saveReadingProgress()
  }
}

function clearAnalysisOnly() {
  analyzingId.value = null
  aiState.content = ''
  aiState.loading = false
  aiState.error = false
}

function clearAiResultsOnly() {
  clearAnalysisOnly()
}

function clearAiResults() {
  clearAiResultsOnly()
  selectedParagraphId.value = null
}

/** 仅换书时清空 AI 助手，翻页保留分析与选中状态 */
function clearReaderAiSession() {
  clearAiResults()
  aiPanelOpen.value = false
}

function handleAiFabClick() {
  if (!selectedParagraph.value) {
    showMessage('请先点击选中一个段落', { type: 'info' })
    return
  }
  aiPanelOpen.value = !aiPanelOpen.value
}

watch(selectedParagraph, (p) => {
  if (!p) aiPanelOpen.value = false
})

onBeforeUnmount(saveProgressBeforeLeave)

function requireApiKey() {
  if (!settings.deepseekApiKey) {
    modal.title = '需要配置 API Key'
    modal.content =
      '请先在右上角设置中填写 DeepSeek API Key，才能使用翻译、AI 分析等功能。'
    modal.loading = false
    modal.error = false
    modal.variant = 'alert'
    modal.visible = true
    return false
  }
  return true
}

const {
  readingViewMode,
  readingViewModes,
  needsTranslation,
  loadBookTranslations,
  persistTranslation,
  setReadingViewMode,
  requestLazyTranslation,
  updateProgress,
} = useBilingualReader({
  booksStore,
  settings,
  translations,
  translationErrors,
  translating,
  getBookId: () => route.params.bookId,
  requireApiKey,
})

watch(() => route.params.bookId, syncReaderBook, { immediate: true })

function goSettingsFromModal() {
  modal.visible = false
  router.push({ name: 'settings' })
}

function handleRequestTranslation(paragraph) {
  requestLazyTranslation(paragraph)
}

async function handleSetReadingViewMode(mode) {
  const el = readerScrollRef.value
  const pos = el ? captureReadingPosition(el) : null
  await setReadingViewMode(mode)
  if (!pos || !booksStore.pages.length) return
  await nextTick()
  await nextTick()
  restoreReadingPosition(pos.pageIndex, pos.paragraphId)
}

function selectParagraph(p) {
  if (selectedParagraphId.value !== p.id) {
    clearAnalysisOnly()
  }
  selectedParagraphId.value = p.id
}

function runAnalyze() {
  const p = selectedParagraph.value
  if (p) handleAnalyze(p)
}

async function handleAnalyze(paragraph) {
  if (!requireApiKey()) return
  if (paragraph.type === 'image') {
    showMessage('图片内容暂不支持 AI 分析', { type: 'info' })
    return
  }
  selectParagraph(paragraph)

  aiState.loading = true
  aiState.error = false
  aiState.content = ''
  const targetId = paragraph.id
  analyzingId.value = targetId

  try {
    const result = await analyzeParagraph(settings.deepseekApiKey, paragraph.text)
    if (selectedParagraphId.value !== targetId) return
    aiState.content = result
  } catch (err) {
    if (selectedParagraphId.value !== targetId) return
    aiState.content = formatDeepSeekError(err, 'AI 分析')
    aiState.error = true
  } finally {
    if (selectedParagraphId.value === targetId) {
      aiState.loading = false
      analyzingId.value = null
    }
  }
}

function syncActiveTocFromScroll() {
  const toc = book.value?.toc
  if (!toc?.length) return
  const pos = captureReadingPosition(readerScrollRef.value)
  if (!pos) return
  booksStore.setActiveTocId(
    syncActiveTocId(toc, booksStore.pages, pos.pageIndex, pos.paragraphId)
  )
}

function handleReaderScroll() {
  onReaderScroll()
  if (!isRestoring.value && !isScrollAnchoring?.value) {
    syncActiveTocFromScroll()
  }
}

function handleGotoPage(target) {
  const item =
    typeof target === 'object' && target != null ? target : { pageIndex: target }
  booksStore.setActiveTocId(item.id || null)

  const paragraphId =
    item.paragraphIndex != null
      ? findParagraphIdAtIndex(booksStore.pages, item.paragraphIndex)
      : null

  if (paragraphId) {
    restoreReadingPosition(item.pageIndex, paragraphId)
  } else {
    goToPageAtStart(item.pageIndex)
  }
}

function getReaderScrollEl() {
  return readerScrollRef.value
}

function turnNextPage() {
  const next = booksStore.currentPageIndex + 1
  if (next >= booksStore.pages.length) return
  goToPageAtStart(next)
}

function turnPrevPage() {
  const prev = booksStore.currentPageIndex - 1
  if (prev < 0) return
  goToPageAtStart(prev)
}

function scrollReaderBy(deltaY) {
  getReaderScrollEl()?.scrollBy({ top: deltaY, behavior: 'smooth' })
}

function handleReaderWheel(e) {
  if (!canTurnPage()) return
  onReaderWheel(e)
}

const fontScale = computed(() => settings.fontScale)
const fontScaleMin = computed(() => settings.fontScaleMin)
const fontScaleMax = computed(() => settings.fontScaleMax)
const canShrinkFont = computed(() => fontScale.value > fontScaleMin.value)
const canGrowFont = computed(() => fontScale.value < fontScaleMax.value)

function adjustFont(delta) {
  settings.adjustFontScale(delta)
}

function isEditableTarget(target) {
  if (!target || !(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  return target.isContentEditable
}

function canTurnPage() {
  return (
    !!book.value &&
    !isRestoring.value &&
    !contentMissing.value &&
    !modal.visible &&
    booksStore.pages.length > 0
  )
}

function onReaderKeydown(e) {
  if (isEditableTarget(e.target)) return

  if (
    !e.ctrlKey &&
    !e.metaKey &&
    !e.altKey &&
    !e.shiftKey &&
    canTurnPage()
  ) {
    const el = getReaderScrollEl()

    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      turnPrevPage()
      return
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      turnNextPage()
      return
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const down = e.key === 'ArrowDown'
      const step = el ? Math.max(72, Math.round(el.clientHeight * 0.38)) : 120
      e.preventDefault()
      if (
        el &&
        ((down && isScrollable(el) && !atScrollBottom(el)) ||
          (!down && isScrollable(el) && !atScrollTop(el)))
      ) {
        scrollReaderBy(down ? step : -step)
      } else {
        tryArrowScroll(el, down ? 'down' : 'up')
      }
      return
    }
  }

  if (!e.ctrlKey && !e.metaKey) return
  if (e.key === '=' || e.key === '+') {
    e.preventDefault()
    if (canGrowFont.value) adjustFont(settings.fontScaleStep)
  } else if (e.key === '-' || e.key === '_') {
    e.preventDefault()
    if (canShrinkFont.value) adjustFont(-settings.fontScaleStep)
  } else if (e.key === '0') {
    e.preventDefault()
    settings.resetFontScale()
  }
}

const SIDEBAR_WIDTH_KEY = 'agent-reader-sidebar-width'
const SIDEBAR_COLLAPSED_KEY = 'agent-reader-sidebar-collapsed'
const SIDEBAR_MIN = 200
const SIDEBAR_MAX = 480

function clampSidebarWidth(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 280
  return Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, Math.round(n)))
}

function readSidebarWidth() {
  try {
    const raw = localStorage.getItem(SIDEBAR_WIDTH_KEY)
    if (raw != null) return clampSidebarWidth(parseInt(raw, 10))
  } catch {
    /* ignore */
  }
  return 280
}

function readSidebarCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

const sidebarWidth = ref(readSidebarWidth())
const sidebarCollapsed = ref(readSidebarCollapsed())
const sidebarResizing = ref(false)

const sidebarWrapStyle = computed(() => ({
  width: sidebarCollapsed.value ? '0px' : `${sidebarWidth.value}px`,
}))

function persistSidebarWidth() {
  try {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth.value))
  } catch {
    /* ignore */
  }
}

function persistSidebarCollapsed() {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed.value ? '1' : '0')
  } catch {
    /* ignore */
  }
}

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
  persistSidebarCollapsed()
}

function startSidebarResize(e) {
  if (sidebarCollapsed.value) return
  if (e.type === 'mousedown' && e.button !== 0) return
  e.preventDefault()

  const point = e.touches?.[0] ?? e
  const startX = point.clientX
  const startWidth = sidebarWidth.value

  sidebarResizing.value = true

  const onMove = (ev) => {
    const x = ev.touches?.[0]?.clientX ?? ev.clientX
    sidebarWidth.value = clampSidebarWidth(startWidth + (x - startX))
  }

  const onEnd = () => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onEnd)
    window.removeEventListener('touchmove', onMove)
    window.removeEventListener('touchend', onEnd)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    sidebarResizing.value = false
    persistSidebarWidth()
  }

  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onEnd)
  window.addEventListener('touchmove', onMove, { passive: false })
  window.addEventListener('touchend', onEnd)
}

function onSidebarResizeKeydown(e) {
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    sidebarWidth.value = clampSidebarWidth(sidebarWidth.value - 16)
    persistSidebarWidth()
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    sidebarWidth.value = clampSidebarWidth(sidebarWidth.value + 16)
    persistSidebarWidth()
  }
}

const AI_PANEL_WIDTH_KEY = 'agent-reader-ai-panel-width'
const AI_PANEL_MIN = 260
const AI_PANEL_MAX = 640

function clampAiPanelWidth(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 340
  return Math.min(AI_PANEL_MAX, Math.max(AI_PANEL_MIN, Math.round(n)))
}

function readAiPanelWidth() {
  try {
    const raw = localStorage.getItem(AI_PANEL_WIDTH_KEY)
    if (raw != null) return clampAiPanelWidth(parseInt(raw, 10))
  } catch {
    /* ignore */
  }
  return 340
}

const aiPanelWidth = ref(readAiPanelWidth())

function persistAiPanelWidth() {
  try {
    localStorage.setItem(AI_PANEL_WIDTH_KEY, String(aiPanelWidth.value))
  } catch {
    /* ignore */
  }
}

function startAiPanelResize(e) {
  if (e.type === 'mousedown' && e.button !== 0) return
  e.preventDefault()

  const point = e.touches?.[0] ?? e
  const startX = point.clientX
  const startWidth = aiPanelWidth.value

  const onMove = (ev) => {
    const x = ev.touches?.[0]?.clientX ?? ev.clientX
    aiPanelWidth.value = clampAiPanelWidth(startWidth + (startX - x))
  }

  const onEnd = () => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onEnd)
    window.removeEventListener('touchmove', onMove)
    window.removeEventListener('touchend', onEnd)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    persistAiPanelWidth()
  }

  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onEnd)
  window.addEventListener('touchmove', onMove, { passive: false })
  window.addEventListener('touchend', onEnd)
}

function onAiPanelResizeKeydown(e) {
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    aiPanelWidth.value = clampAiPanelWidth(aiPanelWidth.value + 16)
    persistAiPanelWidth()
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    aiPanelWidth.value = clampAiPanelWidth(aiPanelWidth.value - 16)
    persistAiPanelWidth()
  }
}

const AI_FAB_POS_KEY = 'agent-reader-ai-fab-position'
const FAB_SIZE = 60
const FAB_MARGIN = 12
const FAB_DRAG_THRESHOLD = 6

function clampFabPosition(x, y) {
  const maxX = window.innerWidth - FAB_SIZE - FAB_MARGIN
  const maxY = window.innerHeight - FAB_SIZE - FAB_MARGIN
  return {
    x: Math.min(maxX, Math.max(FAB_MARGIN, Math.round(x))),
    y: Math.min(maxY, Math.max(FAB_MARGIN, Math.round(y))),
  }
}

function getDefaultFabPosition() {
  return clampFabPosition(
    window.innerWidth - FAB_SIZE - 22,
    window.innerHeight - FAB_SIZE - 74
  )
}

function readFabPosition() {
  try {
    const raw = localStorage.getItem(AI_FAB_POS_KEY)
    if (raw) {
      const { x, y } = JSON.parse(raw)
      if (Number.isFinite(x) && Number.isFinite(y)) return clampFabPosition(x, y)
    }
  } catch {
    /* ignore */
  }
  return null
}

const fabPosition = ref(readFabPosition())
const fabDragging = ref(false)

const fabStyle = computed(() => {
  const pos = fabPosition.value ?? getDefaultFabPosition()
  return { left: `${pos.x}px`, top: `${pos.y}px` }
})

function persistFabPosition() {
  if (!fabPosition.value) return
  try {
    localStorage.setItem(AI_FAB_POS_KEY, JSON.stringify(fabPosition.value))
  } catch {
    /* ignore */
  }
}

function startFabDrag(e) {
  if (e.type === 'mousedown' && e.button !== 0) return

  const point = e.touches?.[0] ?? e
  const startX = point.clientX
  const startY = point.clientY
  const current = fabPosition.value ?? getDefaultFabPosition()
  let moved = false

  const onMove = (ev) => {
    const p = ev.touches?.[0] ?? ev
    const dx = p.clientX - startX
    const dy = p.clientY - startY
    if (!moved && Math.abs(dx) < FAB_DRAG_THRESHOLD && Math.abs(dy) < FAB_DRAG_THRESHOLD) return
    moved = true
    fabDragging.value = true
    ev.preventDefault?.()
    fabPosition.value = clampFabPosition(current.x + dx, current.y + dy)
  }

  const onEnd = () => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onEnd)
    window.removeEventListener('touchmove', onMove)
    window.removeEventListener('touchend', onEnd)
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
    fabDragging.value = false

    if (moved) {
      persistFabPosition()
    } else {
      handleAiFabClick()
    }
  }

  document.body.style.userSelect = 'none'
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onEnd)
  window.addEventListener('touchmove', onMove, { passive: false })
  window.addEventListener('touchend', onEnd)
}

function onFabResize() {
  if (fabPosition.value) {
    fabPosition.value = clampFabPosition(fabPosition.value.x, fabPosition.value.y)
  }
}

onMounted(() => {
  window.addEventListener('keydown', onReaderKeydown)
  if (!fabPosition.value) fabPosition.value = getDefaultFabPosition()
  window.addEventListener('resize', onFabResize)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onReaderKeydown)
  window.removeEventListener('resize', onFabResize)
})

function onPageSlider(e) {
  goToPageAtStart(Number(e.target.value) - 1)
}

function closeModal() {
  modal.visible = false
  modal.variant = 'default'
}

function goToLibrary() {
  saveProgressBeforeLeave()
  router.push({ name: 'library' })
}
</script>

<template>
  <div v-if="book" class="reader-app">
    <AppTopBar />

    <div class="reader-body">
      <div
        class="sidebar-wrap"
        :class="{
          'sidebar-wrap--collapsed': sidebarCollapsed,
          'sidebar-wrap--resizing': sidebarResizing,
        }"
        :style="sidebarWrapStyle"
      >
        <ReaderLeftSidebar :book="book" @goto-page="handleGotoPage" />
      </div>

      <div
        v-if="!sidebarCollapsed"
        class="panel-resizer sidebar-panel-resizer"
        role="separator"
        aria-orientation="vertical"
        aria-label="拖动调整侧边栏宽度"
        tabindex="0"
        title="拖动调整宽度"
        @mousedown="startSidebarResize"
        @touchstart.prevent="startSidebarResize"
        @keydown="onSidebarResizeKeydown"
      >
        <span class="panel-resizer-grip" aria-hidden="true" />
      </div>

      <main class="reader-center">
        <div class="center-toolbar">
          <div class="toolbar-left">
            <button class="btn-back-library" type="button" title="返回我的书架" @click="goToLibrary">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"
                />
              </svg>
              返回书架
            </button>
            <button
              type="button"
              class="btn-sidebar-toggle"
              :class="{ 'btn-sidebar-toggle--collapsed': sidebarCollapsed }"
              :title="sidebarCollapsed ? '展开目录' : '收起目录'"
              :aria-expanded="!sidebarCollapsed"
              aria-label="展开或收起目录侧边栏"
              @click="toggleSidebar"
            >
              <svg class="btn-sidebar-toggle-icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M3 5h8v14H3V5zm10 0h8v14h-8V5zM5 7v10h4V7H5zm12 0v10h4V7h-4z"
                />
              </svg>
              <span>{{ sidebarCollapsed ? '展开目录' : '收起目录' }}</span>
            </button>
            <span class="toolbar-label">阅读</span>
          </div>
          <div class="toolbar-tools">
            <div class="reading-mode-wrap">
              <div
                class="reading-mode-switch"
                role="radiogroup"
                aria-label="阅读显示模式"
              >
                <button
                  v-for="mode in readingViewModes"
                  :key="mode.value"
                  type="button"
                  role="radio"
                  class="reading-mode-segment"
                  :class="{ active: readingViewMode === mode.value }"
                  :aria-checked="readingViewMode === mode.value"
                  :disabled="isRestoring || contentMissing"
                  :title="mode.label"
                  @click="handleSetReadingViewMode(mode.value)"
                >
                  {{ mode.label }}
                </button>
              </div>
            </div>
            <div class="font-tools">
            <button
              class="btn btn-icon font-btn"
              type="button"
              title="缩小字号 (Ctrl+-)"
              :disabled="!canShrinkFont"
              @click="adjustFont(-settings.fontScaleStep)"
            >
              A−
            </button>
            <span class="font-label" title="点击恢复默认字号" @click="settings.resetFontScale()">
              {{ fontScale }}%
            </span>
            <button
              class="btn btn-icon font-btn"
              type="button"
              title="放大字号 (Ctrl+=)"
              :disabled="!canGrowFont"
              @click="adjustFont(settings.fontScaleStep)"
            >
              A+
            </button>
            </div>
          </div>
        </div>

        <div class="chapter-header">
          <h1>第 {{ pageInfo.current }} 页</h1>
          <span class="chapter-meta">共 {{ pageInfo.total }} 页 · {{ book.title }}</span>
        </div>

        <div
          ref="readerScrollRef"
          class="reader-scroll"
          :class="{ 'reader-scroll--bilingual': readingViewMode === 'bilingual' }"
          tabindex="0"
          :style="{ '--reader-font-scale': fontScale / 100 }"
          @scroll="handleReaderScroll"
          @wheel="handleReaderWheel"
        >
          <div v-if="isRestoring" class="reader-empty">
            <div class="reader-restore-spinner" />
            <p class="reader-empty__title">正在恢复阅读…</p>
          </div>
          <div v-else-if="contentMissing" class="reader-empty">
            <p class="reader-empty__title">正文未加载</p>
            <p class="reader-empty__hint">
              请返回书架，重新导入《{{ book.fileName }}》以恢复阅读。
            </p>
            <button class="btn btn-primary btn-sm" type="button" @click="goToLibrary">
              返回书架
            </button>
          </div>
          <div v-else class="reader-stream">
            <section
              v-for="chunk in streamPages"
              :key="`page-${chunk.pageIndex}`"
              class="reader-page-chunk"
              :data-page-index="chunk.pageIndex"
            >
              <div v-if="chunk.pageIndex > 0" class="page-divider" aria-hidden="true">
                <span>第 {{ chunk.pageIndex + 1 }} 页</span>
              </div>
              <ParagraphBlock
                v-for="p in chunk.paragraphs"
                :key="p.id"
                :paragraph="p"
                :selected="selectedParagraphId === p.id"
                :reading-view-mode="readingViewMode"
                :translation="translations[p.id] || ''"
                :translation-error="translationErrors[p.id] || ''"
                :translating="!!translating[p.id]"
                @select="selectParagraph(p)"
                @request-translation="handleRequestTranslation"
              />
            </section>
          </div>
        </div>

        <footer class="reader-footer">
          <button
            class="btn btn-ghost btn-sm"
            type="button"
            :disabled="booksStore.currentPageIndex === 0"
            @click="turnPrevPage()"
          >
            ← 上一页
          </button>
          <div class="page-slider-wrap">
            <input
              type="range"
              class="page-slider"
              :min="1"
              :max="pageInfo.total"
              :value="pageInfo.current"
              @input="onPageSlider"
            />
            <span class="page-num">{{ pageInfo.current }} / {{ pageInfo.total }}</span>
          </div>
          <button
            class="btn btn-primary btn-sm"
            type="button"
            :disabled="booksStore.currentPageIndex >= booksStore.pages.length - 1"
            @click="turnNextPage()"
          >
            下一页 →
          </button>
        </footer>
      </main>

      <template v-if="aiPanelOpen && selectedParagraph">
        <div
          class="panel-resizer"
          role="separator"
          aria-orientation="vertical"
          aria-label="拖动调整 AI 助手宽度"
          tabindex="0"
          title="拖动调整宽度"
          @mousedown="startAiPanelResize"
          @touchstart.prevent="startAiPanelResize"
          @keydown="onAiPanelResizeKeydown"
        >
          <span class="panel-resizer-grip" aria-hidden="true" />
        </div>

        <aside class="ai-panel-aside" :style="{ width: aiPanelWidth + 'px' }">
          <AiAssistantPanel
            :has-selection="true"
            :selected-text="selectedParagraph?.text || selectedParagraph?.alt || ''"
            :selected-type="selectedParagraph?.type || 'p'"
            :analysis-content="aiState.content"
            :analysis-loading="aiState.loading"
            :analysis-error="aiState.error"
            @analyze="runAnalyze"
          />
        </aside>
      </template>
    </div>

    <button
      class="ai-fab"
      type="button"
      :class="{
        'ai-fab--ready': !!selectedParagraph && !aiPanelOpen,
        'ai-fab--open': aiPanelOpen,
        'ai-fab--dragging': fabDragging,
      }"
      :style="fabStyle"
      :title="
        aiPanelOpen
          ? '收起 AI 助手'
          : selectedParagraph
            ? '打开 AI 助手'
            : '请先选中左侧段落'
      "
      aria-label="AI 助手"
      @mousedown="startFabDrag"
      @touchstart="startFabDrag"
    >
      <span class="ai-fab-aura" aria-hidden="true" />
      <span class="ai-fab-orbit ai-fab-orbit--1" aria-hidden="true" />
      <span class="ai-fab-orbit ai-fab-orbit--2" aria-hidden="true" />
      <span class="ai-fab-orbit ai-fab-orbit--3" aria-hidden="true" />
      <span class="ai-fab-core">
        <span class="ai-fab-core-shine" aria-hidden="true" />
        <svg class="ai-fab-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 2l1.2 3.6L17 6.8l-3.6 1.2L12 12l-1.2-3.6L7 6.8l3.8-1.2L12 2zm0 12l1.4 4.2L18 20l-4.2-1.4L12 14.4l-1.8 4.2L6 20l4.6-1.8L12 14zm-6-4.5l.9 2.7 2.7.9-2.7.9-.9 2.7-.9-2.7-2.7-.9 2.7-.9.9-2.7zm12 0l.9 2.7 2.7.9-2.7.9-.9 2.7-.9-2.7-2.7-.9 2.7-.9.9-2.7z"
          />
        </svg>
        <span class="ai-fab-label">AI</span>
      </span>
      <span v-if="selectedParagraph && !aiPanelOpen" class="ai-fab-pulse" aria-hidden="true" />
    </button>

    <AppModal
      :visible="modal.visible"
      :title="modal.title"
      :loading="modal.loading"
      :error="modal.error"
      :variant="modal.variant"
      @close="closeModal"
    >
      <div v-if="modal.variant === 'alert'" class="api-key-alert">
        <p class="api-key-alert-text">{{ modal.content }}</p>
        <button type="button" class="api-key-alert-btn" @click="goSettingsFromModal">
          <span class="api-key-btn-icon" aria-hidden="true">◈</span>
          前往设置
        </button>
      </div>
      <template v-else>{{ modal.content }}</template>
    </AppModal>
  </div>
</template>

<style scoped>
.reader-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: var(--bg);
  position: relative;
}

.ai-fab {
  --fab-cyan: #22d3ee;
  --fab-blue: #3b82f6;
  --fab-purple: #a78bfa;

  position: fixed;
  z-index: 60;
  width: 60px;
  height: 60px;
  padding: 0;
  border: none;
  border-radius: 50%;
  cursor: grab;
  touch-action: none;
  background: transparent;
  color: var(--text-muted);
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.ai-fab:hover {
  transform: translateY(-3px) scale(1.03);
}

.ai-fab:active {
  transform: translateY(-1px) scale(0.98);
}

.ai-fab--dragging,
.ai-fab--dragging:hover,
.ai-fab--dragging:active {
  cursor: grabbing;
  transform: none;
  transition: none;
}

.ai-fab-aura {
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  background: var(--bg-panel);
  border: 1px solid var(--border-strong);
  box-shadow: var(--shadow-lg);
  transition:
    box-shadow 0.35s,
    border-color 0.35s,
    background 0.35s;
}

.ai-fab-orbit {
  position: absolute;
  border-radius: 50%;
  border: 1px solid transparent;
  pointer-events: none;
  opacity: 0.35;
  transition: opacity 0.35s;
}

.ai-fab-orbit--1 {
  inset: 0;
  border-color: rgba(59, 130, 246, 0.22);
  border-style: dashed;
}

.ai-fab-orbit--2 {
  inset: -5px;
  border-color: rgba(139, 92, 246, 0.18);
}

.ai-fab-orbit--3 {
  inset: -10px;
  border-color: rgba(34, 211, 238, 0.1);
  border-style: dotted;
}

.ai-fab:not(.ai-fab--ready):not(.ai-fab--open) .ai-fab-aura {
  border-color: rgba(59, 130, 246, 0.32);
  box-shadow:
    var(--shadow-lg),
    0 0 0 1px rgba(59, 130, 246, 0.1);
}

.ai-fab:not(.ai-fab--ready):not(.ai-fab--open) .ai-fab-orbit {
  opacity: 0.52;
}

.ai-fab:not(.ai-fab--ready):not(.ai-fab--open) .ai-fab-orbit--1 {
  border-color: rgba(59, 130, 246, 0.34);
}

.ai-fab:not(.ai-fab--ready):not(.ai-fab--open) .ai-fab-orbit--2 {
  border-color: rgba(139, 92, 246, 0.28);
}

.ai-fab:not(.ai-fab--ready):not(.ai-fab--open) .ai-fab-orbit--3 {
  border-color: rgba(34, 211, 238, 0.2);
}

.ai-fab:not(.ai-fab--ready):not(.ai-fab--open) .ai-fab-core {
  border-color: rgba(96, 165, 250, 0.28);
}

.ai-fab:not(.ai-fab--ready):not(.ai-fab--open) .ai-fab-icon {
  opacity: 0.68;
  color: var(--accent-hover);
}

.ai-fab:not(.ai-fab--ready):not(.ai-fab--open) .ai-fab-label {
  color: var(--accent-hover);
}

[data-theme='light'] .ai-fab:not(.ai-fab--ready):not(.ai-fab--open) .ai-fab-core {
  background: linear-gradient(145deg, #eef4ff 0%, #dbeafe 100%);
  border-color: rgba(37, 99, 235, 0.3);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.95),
    0 2px 10px rgba(37, 99, 235, 0.14);
}

[data-theme='light'] .ai-fab:not(.ai-fab--ready):not(.ai-fab--open) .ai-fab-icon {
  color: #2563eb;
}

[data-theme='light'] .ai-fab:not(.ai-fab--ready):not(.ai-fab--open) .ai-fab-label {
  color: #1d4ed8;
}

.ai-fab-core {
  position: absolute;
  inset: 10px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  overflow: hidden;
  background: linear-gradient(
    145deg,
    rgba(30, 41, 59, 0.95) 0%,
    rgba(15, 23, 42, 0.98) 100%
  );
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  transition:
    background 0.35s,
    border-color 0.35s,
    box-shadow 0.35s;
}

[data-theme='light'] .ai-fab-core {
  background: linear-gradient(145deg, #f8fafc 0%, #e8eef9 100%);
  border-color: rgba(37, 99, 235, 0.15);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.ai-fab-core-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.12) 0%,
    transparent 42%,
    transparent 100%
  );
  pointer-events: none;
}

.ai-fab-icon {
  width: 14px;
  height: 14px;
  opacity: 0.45;
  transition: opacity 0.35s, color 0.35s, filter 0.35s;
}

.ai-fab-label {
  position: relative;
  z-index: 1;
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  font-family: ui-monospace, 'Cascadia Code', monospace;
  transition: color 0.35s, text-shadow 0.35s;
}

.ai-fab-pulse {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--fab-cyan);
  box-shadow: 0 0 10px var(--fab-cyan);
  animation: fab-dot-pulse 2s ease-in-out infinite;
}

@keyframes fab-dot-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.55;
    transform: scale(0.85);
  }
}

/* 已选中段落：轨道旋转 + 核心发光 */
.ai-fab--ready .ai-fab-aura {
  border-color: rgba(59, 130, 246, 0.45);
  box-shadow:
    0 0 0 1px rgba(59, 130, 246, 0.15),
    0 8px 32px rgba(59, 130, 246, 0.28),
    0 0 48px rgba(139, 92, 246, 0.15);
}

.ai-fab--ready .ai-fab-orbit {
  opacity: 1;
}

.ai-fab--ready .ai-fab-orbit--1 {
  animation: fab-orbit-spin 10s linear infinite;
}

.ai-fab--ready .ai-fab-orbit--2 {
  animation: fab-orbit-spin 7s linear infinite reverse;
}

.ai-fab--ready .ai-fab-orbit--3 {
  animation: fab-orbit-spin 14s linear infinite;
}

.ai-fab--ready .ai-fab-core {
  background: linear-gradient(
    145deg,
    rgba(59, 130, 246, 0.35) 0%,
    rgba(139, 92, 246, 0.28) 50%,
    rgba(15, 23, 42, 0.9) 100%
  );
  border-color: rgba(34, 211, 238, 0.45);
  box-shadow:
    inset 0 0 20px rgba(59, 130, 246, 0.25),
    0 0 16px rgba(59, 130, 246, 0.2);
}

[data-theme='light'] .ai-fab--ready .ai-fab-core {
  background: linear-gradient(
    145deg,
    rgba(37, 99, 235, 0.18) 0%,
    rgba(124, 58, 237, 0.12) 50%,
    #ffffff 100%
  );
}

.ai-fab--ready .ai-fab-icon {
  opacity: 1;
  color: var(--fab-cyan);
  filter: drop-shadow(0 0 4px rgba(34, 211, 238, 0.6));
}

.ai-fab--ready .ai-fab-label {
  color: #e0f2fe;
  text-shadow: 0 0 12px rgba(34, 211, 238, 0.5);
}

[data-theme='light'] .ai-fab--ready .ai-fab-label {
  color: var(--accent-hover);
  text-shadow: none;
}

/* 面板已展开 */
.ai-fab--open .ai-fab-aura {
  border-color: rgba(167, 139, 250, 0.55);
  box-shadow:
    0 0 0 2px rgba(139, 92, 246, 0.2),
    0 8px 36px rgba(139, 92, 246, 0.35);
}

.ai-fab--open .ai-fab-orbit--1,
.ai-fab--open .ai-fab-orbit--2 {
  opacity: 0.85;
  animation: fab-orbit-spin 4s linear infinite;
}

.ai-fab--open .ai-fab-core {
  background: linear-gradient(135deg, var(--fab-blue) 0%, var(--fab-purple) 100%);
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    0 0 20px rgba(139, 92, 246, 0.45);
}

.ai-fab--open .ai-fab-icon {
  opacity: 1;
  color: #fff;
  filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.4));
}

.ai-fab--open .ai-fab-label {
  color: #fff;
  text-shadow: 0 0 8px rgba(255, 255, 255, 0.35);
}

@keyframes fab-orbit-spin {
  to {
    transform: rotate(360deg);
  }
}

.ai-fab:not(.ai-fab--ready):not(.ai-fab--open):hover .ai-fab-aura {
  border-color: var(--accent);
}

.ai-fab:not(.ai-fab--ready):not(.ai-fab--open):hover .ai-fab-icon {
  opacity: 0.85;
  color: var(--accent-hover);
}

.ai-fab:not(.ai-fab--ready):not(.ai-fab--open):hover .ai-fab-label {
  color: var(--accent-hover);
}

[data-theme='light'] .ai-fab:not(.ai-fab--ready):not(.ai-fab--open):hover .ai-fab-label {
  color: #1e40af;
}

.reader-body {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

.sidebar-wrap {
  flex-shrink: 0;
  min-width: 0;
  min-height: 0;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: width 0.25s ease;
}

.sidebar-wrap--resizing {
  transition: none;
}

.sidebar-wrap--collapsed {
  border: none;
}

.sidebar-panel-resizer {
  flex-shrink: 0;
}

.reader-body > :deep(.ai-panel) {
  min-height: 0;
}

.ai-panel-aside {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}

.ai-panel-aside :deep(.ai-panel) {
  width: 100%;
  flex: 1;
}

.panel-resizer {
  flex-shrink: 0;
  width: 10px;
  margin: 0 -3px;
  cursor: col-resize;
  position: relative;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: none;
  background: transparent;
  border: none;
  padding: 0;
  outline: none;
}

.panel-resizer::before {
  content: '';
  position: absolute;
  inset: 0;
  width: 1px;
  margin: 0 auto;
  background: var(--border-strong);
  transition: background 0.2s, box-shadow 0.2s;
}

.panel-resizer:hover::before,
.panel-resizer:focus-visible::before {
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent-glow);
}

.panel-resizer-grip {
  position: relative;
  z-index: 1;
  width: 4px;
  height: 40px;
  border-radius: 4px;
  background: var(--border-strong);
  transition: background 0.2s, height 0.2s, box-shadow 0.2s;
}

.panel-resizer:hover .panel-resizer-grip,
.panel-resizer:focus-visible .panel-resizer-grip,
.panel-resizer:active .panel-resizer-grip {
  height: 56px;
  background: linear-gradient(180deg, var(--accent), var(--purple));
  box-shadow: 0 0 12px var(--accent-glow);
}

.reader-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--reader-bg);
}

.center-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 1.5rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  gap: 0.75rem;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
}

.btn-back-library {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.4rem 0.85rem 0.4rem 0.5rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-muted);
  background: var(--bg-panel);
  border: 1px solid var(--border);
  transition: color 0.2s, border-color 0.2s, background 0.2s, transform 0.2s;
  flex-shrink: 0;
}

.btn-back-library:hover {
  color: var(--accent-hover);
  border-color: var(--border-strong);
  background: var(--accent-soft);
  transform: translateX(-2px);
}

.btn-sidebar-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.85rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-muted);
  background: var(--bg-panel);
  border: 1px solid var(--border);
  transition: color 0.2s, border-color 0.2s, background 0.2s;
  flex-shrink: 0;
}

.btn-sidebar-toggle:hover {
  color: var(--accent-hover);
  border-color: var(--border-strong);
  background: var(--accent-soft);
}

.btn-sidebar-toggle--collapsed {
  color: var(--accent-hover);
  border-color: rgba(59, 130, 246, 0.35);
  background: var(--accent-soft);
}

.btn-sidebar-toggle-icon {
  flex-shrink: 0;
  opacity: 0.85;
}

.reading-mode-wrap {
  display: flex;
  flex-direction: row-reverse;
  align-items: center;
  gap: 0.2rem;
  flex-shrink: 0;
}

.reading-mode-switch {
  display: inline-flex;
  border: 1px solid var(--border-strong);
  background: var(--bg-elevated);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.reading-mode-segment {
  min-width: 2.75rem;
  padding: 0.38rem 0.72rem;
  font-size: 0.82rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--text-muted);
  background: transparent;
  border: none;
  border-right: 1px solid var(--border-strong);
  transition: background 0.18s, color 0.18s;
  cursor: pointer;
}

.reading-mode-segment:last-child {
  border-right: none;
}

.reading-mode-segment:hover:not(:disabled):not(.active) {
  color: var(--text);
  background: var(--bg-hover);
}

.reading-mode-segment.active {
  background: var(--text);
  color: var(--bg-panel);
}

.reading-mode-segment:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.toolbar-label {
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--accent-hover);
  padding: 0.4rem 0.85rem;
  background: var(--accent-soft);
  border-radius: var(--radius-sm);
}

.toolbar-tools {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.font-tools {
  padding: 0.2rem 0.35rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-panel);
}

.font-btn {
  min-width: 36px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.font-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.font-label {
  font-size: 0.78rem;
  color: var(--text-dim);
  min-width: 42px;
  text-align: center;
  cursor: pointer;
  user-select: none;
  border-radius: 4px;
  padding: 0.2rem 0.25rem;
  transition: color 0.2s, background 0.2s;
}

.font-label:hover {
  color: var(--accent-hover);
  background: var(--accent-soft);
}

.chapter-header {
  padding: 1.5rem 2rem 0.5rem;
  flex-shrink: 0;
}

.chapter-header h1 {
  font-size: 1.35rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.chapter-meta {
  font-size: 0.8rem;
  color: var(--text-dim);
}

.reader-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.5rem 2rem 1.5rem;
  min-height: 0;
  outline: none;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.reader-scroll:focus-visible {
  box-shadow: inset 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.reader-stream {
  display: flex;
  flex-direction: column;
}

.reader-page-chunk {
  display: block;
}

.page-divider {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin: 0.35rem 0 0.15rem;
  padding: 0;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--text-dim);
  opacity: 0.75;
  user-select: none;
}

.page-divider::before,
.page-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border);
}

.reader-page-chunk :deep(.paragraph:last-child) {
  border-bottom: none;
}

.reader-empty {
  max-width: 420px;
  margin: 3rem auto;
  padding: 1.5rem;
  text-align: center;
  border-radius: var(--radius);
  border: 1px dashed var(--border-strong);
  background: var(--bg-panel);
}

.reader-empty__title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.reader-empty__hint {
  font-size: 0.88rem;
  color: var(--text-muted);
  line-height: 1.6;
  margin-bottom: 1rem;
}

.reader-restore-spinner {
  width: 36px;
  height: 36px;
  margin: 0 auto 1rem;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: reader-spin 0.8s linear infinite;
}

@keyframes reader-spin {
  to {
    transform: rotate(360deg);
  }
}

.reader-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1.5rem;
  border-top: 1px solid var(--border);
  background: var(--bg-panel);
  flex-shrink: 0;
}

.page-slider-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  max-width: 320px;
}

.page-slider {
  flex: 1;
  accent-color: var(--accent);
}

.page-num {
  font-size: 0.8rem;
  color: var(--text-muted);
  white-space: nowrap;
}

.api-key-alert {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.api-key-alert-text {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.75;
  color: var(--text-muted);
}

.api-key-alert-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  width: 100%;
  height: 44px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  font-size: 0.92rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(135deg, var(--accent), var(--purple));
  box-shadow: 0 2px 16px var(--accent-glow);
  transition: filter 0.2s, transform 0.2s, box-shadow 0.2s;
}

.api-key-alert-btn:hover {
  filter: brightness(1.08);
  transform: translateY(-1px);
  box-shadow: 0 4px 24px var(--accent-glow);
}

.api-key-btn-icon {
  font-size: 0.85rem;
  opacity: 0.9;
}
</style>
