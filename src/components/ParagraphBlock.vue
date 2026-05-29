<script setup>
defineProps({
  paragraph: { type: Object, required: true },
  selected: Boolean,
  translation: { type: String, default: '' },
  translationError: { type: String, default: '' },
  translating: Boolean,
})

const emit = defineEmits(['select', 'translate'])
</script>

<template>
  <article class="paragraph" :class="{ selected }" @click="emit('select')">
    <p class="text reader-font">{{ paragraph.text }}</p>

    <div v-if="selected" class="paragraph-actions" @click.stop>
      <button
        class="btn-translate"
        type="button"
        :disabled="translating"
        @click="emit('translate')"
      >
        {{ translating ? '翻译中…' : '翻译' }}
      </button>
    </div>

    <div
      v-if="translating || translation || translationError"
      class="translation-block"
      @click.stop
    >
      <p v-if="translating" class="translation-loading">正在翻译…</p>
      <p v-else-if="translationError" class="translation-error">{{ translationError }}</p>
      <p v-else class="translation-text reader-font">{{ translation }}</p>
    </div>
  </article>
</template>

<style scoped>
.paragraph {
  padding: 1.25rem 0;
  border-bottom: 1px solid var(--border);
  transition: background 0.2s;
  cursor: pointer;
}

.paragraph:last-child {
  border-bottom: none;
}

.paragraph.selected {
  background: var(--accent-soft);
  margin: 0 -1rem;
  padding: 1.25rem 1rem;
  border-radius: var(--radius-sm);
  border-bottom-color: transparent;
}

.text {
  font-size: calc(1.05rem * var(--reader-font-scale, 1));
  line-height: 1.9;
  color: var(--text);
}

.paragraph-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.65rem;
}

.btn-translate {
  padding: 0.35rem 0.85rem;
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--accent-hover);
  background: transparent;
  border: 1px solid rgba(59, 130, 246, 0.4);
  border-radius: var(--radius-sm);
  transition: all 0.2s;
}

.btn-translate:hover:not(:disabled) {
  background: rgba(59, 130, 246, 0.12);
  border-color: var(--accent);
}

.btn-translate:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.translation-block {
  margin-top: 0.75rem;
  padding: 0.85rem 1rem;
  border-radius: var(--radius-sm);
  background: var(--translation-bg);
  border-left: 3px solid var(--accent);
}

.translation-text {
  font-size: calc(0.98rem * var(--reader-font-scale, 1));
  line-height: 1.75;
  color: var(--text);
}

.translation-loading {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.translation-error {
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--danger);
}
</style>
