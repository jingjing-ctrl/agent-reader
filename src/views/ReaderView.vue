<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppTopBar from '../components/AppTopBar.vue'
import AppModal from '../components/AppModal.vue'
import ReaderLeftSidebar from '../components/ReaderLeftSidebar.vue'
import AiAssistantPanel from '../components/AiAssistantPanel.vue'
import ParagraphBlock from '../components/ParagraphBlock.vue'
import { useBooksStore } from '../stores/books'
import { useSettingsStore } from '../stores/settings'
import {
  translateToEnglish,
  analyzeParagraph,
  formatDeepSeekError,
} from '../utils/deepseek'
import { useReaderStream } from '../composables/useReaderStream'

const route = useRoute()
const router = useRouter()
const booksStore = useBooksStore()
const settings = useSettingsStore()

const selectedParagraphId = ref(null)

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

const book = computed(() => booksStore.getBook(route.params.bookId))
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
  resetStream,
  onReaderScroll,
  onReaderWheel,
  tryArrowScroll,
  isScrollable,
  atScrollTop,
  atScrollBottom,
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

  if (booksStore.isPendingNavigation(id)) {
    return
  }

  resetStream()
  clearReaderAiSession()
  restoring.value = true
  try {
    await booksStore.ensureContent(id)
    if (!booksStore.openBook(id)) {
      booksStore.openBookMeta(id)
    }
  } finally {
    restoring.value = false
  }
}

watch(() => route.params.bookId, syncReaderBook, { immediate: true })

function clearAnalysisOnly() {
  analyzingId.value = null
  aiState.content = ''
  aiState.loading = false
  aiState.error = false
}

function clearAiResultsOnly() {
  clearAnalysisOnly()
  for (const key of Object.keys(translations)) delete translations[key]
  for (const key of Object.keys(translationErrors)) delete translationErrors[key]
  for (const key of Object.keys(translating)) delete translating[key]
}

function clearAiResults() {
  clearAiResultsOnly()
  selectedParagraphId.value = null
}

/** 仅换书时清空 AI 助手，翻页保留分析与选中状态 */
function clearReaderAiSession() {
  clearAiResults()
}

watch(
  () => [booksStore.pages.length, isRestoring.value],
  ([len, restoringNow]) => {
    if (restoringNow || !len) return
    syncToPage(booksStore.currentPageIndex, { scroll: true })
  }
)

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

function goSettingsFromModal() {
  modal.visible = false
  router.push({ name: 'settings' })
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

async function handleTranslate(paragraph) {
  if (!requireApiKey()) return
  selectParagraph(paragraph)

  if (translations[paragraph.id] && !translationErrors[paragraph.id]) return

  delete translationErrors[paragraph.id]
  translating[paragraph.id] = true
  try {
    translations[paragraph.id] = await translateToEnglish(
      settings.deepseekApiKey,
      paragraph.text
    )
    delete translationErrors[paragraph.id]
  } catch (err) {
    delete translations[paragraph.id]
    translationErrors[paragraph.id] = formatDeepSeekError(err, '翻译')
  } finally {
    translating[paragraph.id] = false
  }
}

async function handleAnalyze(paragraph) {
  if (!requireApiKey()) return
  selectParagraph(paragraph)

  aiState.loading = true
  aiState.error = false
  aiState.content = ''
  analyzingId.value = paragraph.id

  try {
    aiState.content = await analyzeParagraph(settings.deepseekApiKey, paragraph.text)
  } catch (err) {
    aiState.content = formatDeepSeekError(err, 'AI 分析')
    aiState.error = true
  } finally {
    aiState.loading = false
    analyzingId.value = null
  }
}

function handleGotoPage(index) {
  goToPageAtStart(index)
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

onMounted(() => window.addEventListener('keydown', onReaderKeydown))
onUnmounted(() => window.removeEventListener('keydown', onReaderKeydown))

function onPageSlider(e) {
  goToPageAtStart(Number(e.target.value) - 1)
}

function closeModal() {
  modal.visible = false
  modal.variant = 'default'
}

function goToLibrary() {
  if (booksStore.pages.length && booksStore.currentBookId) {
    booksStore.goToPage(booksStore.currentPageIndex)
  }
  router.push({ name: 'library' })
}
</script>

<template>
  <div v-if="book" class="reader-app">
    <AppTopBar />

    <div class="reader-body">
      <ReaderLeftSidebar :book="book" @goto-page="handleGotoPage" />

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
            <span class="toolbar-label">阅读</span>
          </div>
          <div class="toolbar-tools font-tools">
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

        <div class="chapter-header">
          <h1>第 {{ pageInfo.current }} 页</h1>
          <span class="chapter-meta">共 {{ pageInfo.total }} 页 · {{ book.title }}</span>
        </div>

        <div
          ref="readerScrollRef"
          class="reader-scroll"
          tabindex="0"
          :style="{ '--reader-font-scale': fontScale / 100 }"
          @scroll="onReaderScroll"
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
                <span>第 {{ chunk.pageIndex }} 页</span>
              </div>
              <ParagraphBlock
                v-for="p in chunk.paragraphs"
                :key="p.id"
                :paragraph="p"
                :selected="selectedParagraphId === p.id"
                :translation="translations[p.id] || ''"
                :translation-error="translationErrors[p.id] || ''"
                :translating="!!translating[p.id]"
                @select="selectParagraph(p)"
                @translate="handleTranslate(p)"
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

      <AiAssistantPanel
        :has-selection="!!selectedParagraph"
        :analysis-content="aiState.content"
        :analysis-loading="aiState.loading"
        :analysis-error="aiState.error"
        @analyze="runAnalyze"
      />
    </div>

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
}

.reader-body {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

.reader-body > :deep(.ai-panel) {
  min-height: 0;
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
