<script setup>
import { computed } from 'vue'
import { useBooksStore } from '../stores/books'
import { formatLabel, detectBookFormat } from '../utils/bookImport'
import { getCoverInitial, getCoverStyle } from '../utils/bookCover'
import { isTocItemActive } from '../utils/toc'
import ReaderStatsPanel from './ReaderStatsPanel.vue'

const props = defineProps({
  book: { type: Object, required: true },
})

const emit = defineEmits(['goto-page'])

const booksStore = useBooksStore()

const pageTotal = computed(
  () => booksStore.pages.length || props.book.pageCount || 1
)

const progress = computed(() => {
  const total = pageTotal.value
  const current = Math.min(booksStore.currentPageIndex + 1, total)
  return {
    percent: Math.min(100, Math.round((current / total) * 100)),
    current,
    total,
  }
})

const tocItems = computed(() => props.book.toc || [])

const tocPageLabel = (pageIndex) => `第 ${pageIndex + 1} 页`
</script>

<template>
  <aside class="sidebar">
    <div class="book-card glass-panel">
      <h2 class="book-title">{{ book.title }}</h2>
      <p class="book-meta">{{ formatLabel(book.format || detectBookFormat(book.fileName)) }} · {{ book.fileName }}</p>
      <div class="progress-wrap">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progress.percent + '%' }" />
        </div>
        <span class="progress-text">已读 {{ progress.percent }}%</span>
      </div>
    </div>

    <div class="toc-section">
      <div class="toc-header">
        <div class="cover-wrap">
          <img
            v-if="book.coverUrl"
            :src="book.coverUrl"
            :alt="book.title"
            class="cover-img"
          />
          <div v-else class="cover-fallback" :style="getCoverStyle(book)">
            <span>{{ getCoverInitial(book) }}</span>
          </div>
        </div>
        <h3 class="toc-heading">目录</h3>
      </div>

      <div class="toc-scroll">
        <p v-if="!tocItems.length" class="toc-empty">暂无目录</p>
        <button
          v-for="(item, idx) in tocItems"
          :key="item.id || idx"
          type="button"
          class="toc-item"
          :class="{
            active: isTocItemActive(
              item,
              idx,
              tocItems,
              booksStore.currentPageIndex,
              booksStore.activeTocId
            ),
          }"
          :style="{ paddingLeft: `calc(0.65rem + ${item.depth || 0} * 0.85rem)` }"
          @click="emit('goto-page', item)"
        >
          <span class="toc-title">{{ item.title }}</span>
          <span class="page-num">{{ tocPageLabel(item.pageIndex) }}</span>
        </button>
      </div>
    </div>

    <ReaderStatsPanel class="sidebar-stats" :book="book" />
  </aside>
</template>

<style scoped>
.sidebar {
  width: 100%;
  height: 100%;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--bg-panel);
  overflow: hidden;
  min-height: 0;
}

.book-card {
  padding: 1rem;
  text-align: left;
  flex-shrink: 0;
}

.toc-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.toc-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
  padding: 0 0.25rem 0.5rem;
}

.cover-wrap {
  flex-shrink: 0;
}

.cover-img,
.cover-fallback {
  width: 56px;
  height: 74px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}

.cover-img {
  object-fit: cover;
  display: block;
}

.cover-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
  background: linear-gradient(145deg, var(--cover-a), var(--cover-b));
}

.book-title {
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.35;
  margin-bottom: 0.25rem;
}

.book-meta {
  font-size: 0.72rem;
  color: var(--text-dim);
  margin-bottom: 0.75rem;
}

.progress-bar {
  height: 4px;
  background: var(--bg-muted);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 0.35rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--purple));
  border-radius: 2px;
  transition: width 0.3s;
}

.progress-text {
  font-size: 0.72rem;
  color: var(--accent-hover);
}

.toc-heading {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-muted);
  margin: 0;
}

.toc-scroll {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.toc-empty {
  font-size: 0.78rem;
  color: var(--text-dim);
  padding: 0.5rem 0.65rem;
}

.toc-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0.65rem;
  font-size: 0.82rem;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  text-align: left;
}

.toc-title {
  flex: 1;
  line-height: 1.45;
  word-break: break-word;
}

.toc-item:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.toc-item.active {
  background: var(--accent-soft);
  color: var(--accent-hover);
}

.page-num {
  flex-shrink: 0;
  font-size: 0.68rem;
  color: var(--text-dim);
  padding-top: 0.1rem;
}

.sidebar-stats {
  flex-shrink: 0;
  margin-top: auto;
}

.sidebar-stats :deep(.reader-stats) {
  box-shadow: none;
}
</style>
