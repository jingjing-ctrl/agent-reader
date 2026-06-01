<script setup>
import { computed } from 'vue'
import { useBooksStore } from '../stores/books'

const props = defineProps({
  book: { type: Object, default: null },
})

const booksStore = useBooksStore()

const pageTotal = computed(
  () => booksStore.pages.length || props.book?.pageCount || 1
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
</script>

<template>
  <aside class="reader-stats" aria-label="阅读统计">
    <h3 class="reader-stats-title">阅读统计</h3>
    <div class="reader-stats-row">
      <div class="donut" aria-hidden="true">
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
      <div class="reader-stats-info">
        <p class="reader-stats-pages">
          <strong>{{ progress.current }}</strong> / {{ progress.total }} 页
        </p>
        <p class="reader-stats-hint">本次会话阅读</p>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.reader-stats {
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-panel);
  box-shadow: var(--shadow);
  min-width: 11.5rem;
}

.reader-stats-title {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 0.55rem;
}

.reader-stats-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.donut {
  position: relative;
  width: 44px;
  height: 44px;
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
  transition: stroke-dasharray 0.3s ease;
}

.donut-label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.62rem;
  font-weight: 600;
  color: var(--text);
}

.reader-stats-pages {
  font-size: 0.82rem;
  color: var(--text);
  line-height: 1.35;
}

.reader-stats-hint {
  margin-top: 0.12rem;
  font-size: 0.72rem;
  color: var(--text-dim);
}
</style>
