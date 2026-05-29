<script setup>
defineProps({
  selectedCount: { type: Number, default: 0 },
  isPageFullySelected: { type: Boolean, default: false },
  isFilterFullySelected: { type: Boolean, default: false },
  moveOptions: { type: Array, default: () => [] },
  menuOpen: { type: Boolean, default: false },
})

defineEmits(['toggle-page', 'toggle-filter', 'toggle-menu', 'move-to', 'delete'])
</script>

<template>
  <div class="batch-toolbar">
    <span class="batch-count">已选 {{ selectedCount }} 本</span>
    <button class="batch-btn" type="button" @click="$emit('toggle-page')">
      {{ isPageFullySelected ? '取消本页' : '全选本页' }}
    </button>
    <button class="batch-btn" type="button" @click="$emit('toggle-filter')">
      {{ isFilterFullySelected ? '取消全选' : '全选当前分组' }}
    </button>
    <div class="batch-move-wrap">
      <button
        class="batch-btn batch-btn--primary"
        type="button"
        :disabled="selectedCount === 0"
        @click="$emit('toggle-menu', $event)"
      >
        转移到 ▾
      </button>
      <div v-if="menuOpen" class="batch-move-menu" @click.stop>
        <button
          v-for="opt in moveOptions"
          :key="opt.id ?? 'none'"
          type="button"
          @click="$emit('move-to', opt.id)"
        >
          {{ opt.name }}
        </button>
      </div>
    </div>
    <button
      class="batch-btn batch-btn--danger"
      type="button"
      :disabled="selectedCount === 0"
      @click="$emit('delete')"
    >
      删除
    </button>
  </div>
</template>

<style scoped>
.batch-toolbar {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.65rem;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}

.batch-count {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--accent-hover);
  margin-right: 0.25rem;
}

.batch-btn {
  padding: 0.38rem 0.75rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-muted);
  background: var(--bg-muted);
  border: 1px solid var(--border);
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}

.batch-btn:hover:not(:disabled) {
  color: var(--text);
  border-color: var(--border-strong);
  background: var(--bg-hover);
}

.batch-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.batch-btn--primary {
  color: var(--accent-hover);
  background: var(--accent-soft);
}

.batch-btn--danger {
  color: var(--danger);
  background: rgba(220, 38, 38, 0.08);
  border-color: rgba(220, 38, 38, 0.2);
}

.batch-move-wrap {
  position: relative;
}

.batch-move-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 140px;
  padding: 0.35rem;
  border-radius: 10px;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  z-index: 30;
}

.batch-move-menu button {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.45rem 0.65rem;
  border-radius: 6px;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.batch-move-menu button:hover {
  background: var(--bg-hover);
  color: var(--text);
}

@media (max-width: 640px) {
  .batch-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .batch-count {
    margin-right: 0;
    margin-bottom: 0.25rem;
  }

  .batch-move-wrap {
    width: 100%;
  }

  .batch-move-wrap .batch-btn--primary {
    width: 100%;
  }
}
</style>
