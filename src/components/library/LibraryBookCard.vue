<script setup>
import { getCoverInitial, getCoverStyle, getReadPercent } from '../../utils/bookCover'

defineProps({
  book: { type: Object, required: true },
  batchMode: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
  groupName: { type: String, default: '' },
  groupOptions: { type: Array, default: () => [] },
  menuOpen: { type: Boolean, default: false },
})

const emit = defineEmits(['click', 'toggle-select', 'toggle-menu', 'move-to-group', 'delete'])
</script>

<template>
  <article
    class="book-card"
    :class="{ 'book-card--selected': batchMode && selected }"
    @click="emit('click')"
  >
    <label v-if="batchMode" class="card-check" @click.stop>
      <input type="checkbox" :checked="selected" @change="emit('toggle-select')" />
    </label>

    <div class="card-cover-wrap">
      <div class="card-cover" :style="book.coverUrl ? undefined : getCoverStyle(book)">
        <img
          v-if="book.coverUrl"
          :src="book.coverUrl"
          :alt="book.title"
          class="cover-img"
        />
        <template v-else>
          <div class="cover-shine" />
          <span class="cover-spine" aria-hidden="true" />
          <span class="cover-initial">{{ getCoverInitial(book) }}</span>
        </template>
      </div>
    </div>

    <div class="card-body">
      <p v-if="groupName" class="card-group-tag">{{ groupName }}</p>
      <h3 class="card-title">{{ book.title }}</h3>
      <p class="card-file">{{ book.fileName }}</p>
      <div class="card-progress">
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: `${getReadPercent(book)}%` }" />
        </div>
        <div class="progress-meta">
          <span>{{ book.pageCount || 0 }} 页</span>
          <span v-if="getReadPercent(book) > 0" class="progress-pct">
            已读 {{ getReadPercent(book) }}%
          </span>
          <span v-else class="progress-pct progress-pct--new">未开始</span>
        </div>
      </div>
    </div>

    <div v-if="!batchMode" class="card-actions-top">
      <div v-if="groupOptions.length" class="card-group-wrap">
        <button
          class="card-group-btn"
          type="button"
          title="移动到分组"
          @click="emit('toggle-menu', $event)"
        >
          📁
        </button>
        <div v-if="menuOpen" class="card-group-menu" @click.stop>
          <button
            v-for="opt in groupOptions"
            :key="opt.id ?? 'none'"
            type="button"
            @click="emit('move-to-group', $event, opt.id)"
          >
            {{ opt.name }}
          </button>
        </div>
      </div>
      <button
        class="card-delete"
        type="button"
        title="从书架移除"
        aria-label="删除"
        @click="emit('delete', $event)"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
          <path
            fill="currentColor"
            d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
          />
        </svg>
      </button>
    </div>
  </article>
</template>

<style scoped>
.book-card {
  position: relative;
  cursor: pointer;
  border-radius: 14px;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  overflow: hidden;
  transition:
    transform 0.28s cubic-bezier(0.34, 1.2, 0.64, 1),
    box-shadow 0.28s ease,
    border-color 0.2s;
  box-shadow: var(--shadow);
}

.book-card:hover {
  transform: translateY(-6px);
  border-color: var(--border-strong);
  box-shadow: var(--shadow-lg);
}

.book-card--selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-soft), var(--shadow-lg);
}

.card-check {
  position: absolute;
  top: 0.55rem;
  left: 0.55rem;
  z-index: 5;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid var(--border);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  cursor: pointer;
}

[data-theme='dark'] .card-check {
  background: var(--bg-elevated);
}

.card-check input {
  width: 14px;
  height: 14px;
  accent-color: var(--accent);
  cursor: pointer;
}

.card-cover-wrap {
  padding: 1rem 1rem 0;
}

.card-cover {
  position: relative;
  aspect-ratio: 2.3 / 2.8;
  border-radius: 8px 10px 10px 8px;
  background: linear-gradient(145deg, var(--cover-a), var(--cover-b));
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18), 0 2px 6px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.28s ease;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.book-card:hover .card-cover {
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.22), 0 4px 10px rgba(0, 0, 0, 0.12);
}

.cover-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    125deg,
    rgba(255, 255, 255, 0.28) 0%,
    transparent 42%,
    transparent 100%
  );
  pointer-events: none;
}

.cover-spine {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 8px 0 0 8px;
}

.cover-initial {
  font-family: 'Literata', 'Noto Serif SC', Georgia, serif;
  font-size: 2.4rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
  user-select: none;
}

.card-body {
  padding: 0.85rem 1rem 1rem;
}

.card-group-tag {
  display: inline-block;
  font-size: 0.65rem;
  font-weight: 600;
  padding: 0.12rem 0.45rem;
  margin-bottom: 0.35rem;
  border-radius: 4px;
  color: var(--accent-hover);
  background: var(--accent-soft);
  border: 1px solid var(--border);
}

.card-title {
  font-size: 0.92rem;
  font-weight: 600;
  line-height: 1.45;
  margin-bottom: 0.25rem;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.card-file {
  font-size: 0.68rem;
  color: var(--text-dim);
  margin-bottom: 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-progress {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.progress-track {
  height: 4px;
  border-radius: 999px;
  background: var(--bg-muted);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent), var(--purple));
  transition: width 0.4s ease;
  min-width: 0;
}

.progress-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.68rem;
  color: var(--text-muted);
}

.progress-pct {
  color: var(--accent-hover);
  font-weight: 500;
}

.progress-pct--new {
  color: var(--text-dim);
  font-weight: 400;
}

.card-actions-top {
  position: absolute;
  top: 0.55rem;
  right: 0.55rem;
  display: flex;
  gap: 0.35rem;
  opacity: 0;
  transition: opacity 0.2s;
}

.book-card:hover .card-actions-top {
  opacity: 1;
}

.card-group-wrap {
  position: relative;
}

.card-group-btn,
.card-delete {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

[data-theme='dark'] .card-group-btn,
[data-theme='dark'] .card-delete {
  background: var(--bg-elevated);
}

.card-group-btn {
  font-size: 0.85rem;
}

.card-delete {
  color: var(--text-muted);
  transition: background 0.2s, color 0.2s;
}

.card-delete:hover {
  background: var(--danger);
  color: #fff;
  border-color: transparent;
}

.card-group-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  min-width: 120px;
  padding: 0.3rem;
  border-radius: 10px;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  z-index: 20;
}

.card-group-menu button {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.45rem 0.65rem;
  border-radius: 6px;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.card-group-menu button:hover {
  background: var(--bg-hover);
  color: var(--text);
}
</style>
