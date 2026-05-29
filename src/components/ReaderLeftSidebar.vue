<script setup>
import { computed } from 'vue'
import { useBooksStore } from '../stores/books'
import { formatLabel, detectBookFormat } from '../utils/bookImport'

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

const tocSections = computed(() => {
  const pages = booksStore.pages.length
    ? booksStore.pages
    : props.book.pages || []
  const sections = []
  const perSection = 6
  for (let i = 0; i < pages.length; i += perSection) {
    const num = Math.floor(i / perSection) + 1
    const part = Math.ceil(num / 5)
    sections.push({
      pageIndex: i,
      partLabel: part > 1 ? `第${['一', '二', '三', '四', '五'][part - 1] || part}部` : null,
      title: `第 ${num} 节`,
      pageLabel: `第 ${i + 1} 页`,
      active:
        booksStore.currentPageIndex >= i &&
        booksStore.currentPageIndex < i + perSection,
    })
  }
  return sections
})
</script>

<template>
  <aside class="sidebar">
    <div class="book-card glass-panel">
      <div class="cover">📕</div>
      <h2 class="book-title">{{ book.title }}</h2>
      <p class="book-meta">{{ formatLabel(book.format || detectBookFormat(book.fileName)) }} · {{ book.fileName }}</p>
      <div class="progress-wrap">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progress.percent + '%' }" />
        </div>
        <span class="progress-text">已读 {{ progress.percent }}%</span>
      </div>
    </div>

    <h3 class="toc-heading">目录</h3>

    <div class="toc-scroll">
      <template v-for="(item, idx) in tocSections" :key="idx">
        <p
          v-if="item.partLabel && (idx === 0 || tocSections[idx - 1]?.partLabel !== item.partLabel)"
          class="part-label"
        >
          {{ item.partLabel }}
        </p>
        <button
          type="button"
          class="toc-item"
          :class="{ active: item.active }"
          @click="emit('goto-page', item.pageIndex)"
        >
          <span>{{ item.title }}</span>
          <span class="page-num">{{ item.pageLabel }}</span>
        </button>
      </template>
    </div>

    <div class="stats glass-panel">
      <h3>阅读统计</h3>
      <div class="stats-row">
        <div class="donut">
          <svg viewBox="0 0 36 36">
            <circle class="donut-bg" cx="18" cy="18" r="15.5" />
            <circle
              class="donut-fill"
              cx="18"
              cy="18"
              r="15.5"
              :stroke-dasharray="`${progress.percent} ${100 - progress.percent}`"
            />
          </svg>
          <span class="donut-label">{{ progress.percent }}%</span>
        </div>
        <div class="stats-info">
          <p><strong>{{ progress.current }}</strong> / {{ progress.total }} 页</p>
          <p class="dim">本次会话阅读</p>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--bg-panel);
  border-right: 1px solid var(--border);
  overflow: hidden;
}

.book-card {
  padding: 1rem;
  text-align: center;
  flex-shrink: 0;
}

.cover {
  width: 72px;
  height: 96px;
  margin: 0 auto 0.75rem;
  background: var(--bg-muted);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  border: 1px solid var(--border);
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
  padding: 0 0.25rem;
  flex-shrink: 0;
}

.toc-scroll {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.part-label {
  font-size: 0.72rem;
  color: var(--text-dim);
  padding: 0.5rem 0.5rem 0.25rem;
  font-weight: 500;
}

.toc-item {
  display: flex;
  justify-content: space-between;
  width: 100%;
  padding: 0.5rem 0.65rem;
  font-size: 0.82rem;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  text-align: left;
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
  font-size: 0.72rem;
  color: var(--text-dim);
}

.stats {
  padding: 0.85rem;
  flex-shrink: 0;
}

.stats h3 {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-bottom: 0.65rem;
}

.stats-row {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.donut {
  position: relative;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
}

.donut svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.donut-bg {
  fill: none;
  stroke: var(--bg-muted);
  stroke-width: 3;
}

.donut-fill {
  fill: none;
  stroke: var(--accent);
  stroke-width: 3;
  stroke-linecap: round;
}

.donut-label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 600;
}

.stats-info p {
  font-size: 0.8rem;
}

.stats-info .dim {
  font-size: 0.72rem;
  color: var(--text-dim);
  margin-top: 0.15rem;
}
</style>
