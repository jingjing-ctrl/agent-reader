<script setup>
defineProps({
  currentPage: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  filterLabel: { type: String, default: '' },
  bookCount: { type: Number, default: 0 },
})

defineEmits(['prev', 'next', 'goto'])
</script>

<template>
  <nav class="library-pagination" aria-label="书架分页">
    <button
      class="page-btn page-btn--nav"
      type="button"
      :disabled="currentPage <= 1"
      @click="$emit('prev')"
    >
      上一页
    </button>
    <div class="page-list">
      <button
        v-for="p in totalPages"
        :key="p"
        class="page-btn"
        :class="{ active: p === currentPage }"
        type="button"
        @click="$emit('goto', p)"
      >
        {{ p }}
      </button>
    </div>
    <button
      class="page-btn page-btn--nav"
      type="button"
      :disabled="currentPage >= totalPages"
      @click="$emit('next')"
    >
      下一页
    </button>
    <span class="page-info">
      第 {{ currentPage }} / {{ totalPages }} 页 · {{ filterLabel }} {{ bookCount }} 本
    </span>
  </nav>
</template>

<style scoped>
.library-pagination {
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.65rem 1rem;
  padding: 0.75rem 0 0;
  border-top: 1px solid var(--border);
}

.page-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.page-btn {
  min-width: 36px;
  height: 36px;
  padding: 0 0.65rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-muted);
  background: var(--bg-panel);
  border: 1px solid var(--border);
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}

.page-btn:hover:not(:disabled):not(.active) {
  color: var(--text);
  border-color: var(--border-strong);
  background: var(--bg-elevated);
}

.page-btn.active {
  color: #fff;
  border-color: transparent;
  background: linear-gradient(135deg, var(--accent), var(--purple));
  box-shadow: 0 2px 10px var(--accent-glow);
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-btn--nav {
  min-width: auto;
  padding: 0 1rem;
}

.page-info {
  width: 100%;
  text-align: center;
  font-size: 0.78rem;
  color: var(--text-dim);
}
</style>
