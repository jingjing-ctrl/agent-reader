<script setup>
defineProps({
  visible: Boolean,
  title: { type: String, default: '' },
  loading: Boolean,
  error: Boolean,
})

const emit = defineEmits(['close'])
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="visible" class="modal-overlay" @click.self="emit('close')">
        <div class="modal card" role="dialog" aria-modal="true">
          <header class="modal-header">
            <h2>{{ title }}</h2>
            <button class="close-btn" type="button" aria-label="关闭" @click="emit('close')">
              ×
            </button>
          </header>
          <div class="modal-body" :class="{ 'modal-body--error': error && !loading }">
            <div v-if="loading" class="loading">
              <span class="spinner" />
              <p>正在处理中…</p>
            </div>
            <slot v-else />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  z-index: 1000;
}

.modal {
  width: 100%;
  max-width: 560px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.25s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border);
}

.modal-header h2 {
  font-size: 1.1rem;
  font-weight: 600;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  font-size: 1.4rem;
  line-height: 1;
  color: var(--text-muted);
}

.close-btn:hover {
  background: var(--accent-soft);
  color: var(--text);
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-word;
}

.modal-body--error {
  color: var(--danger);
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  color: var(--text-muted);
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
