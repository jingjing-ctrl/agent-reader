<script setup>
defineProps({
  visible: Boolean,
  title: { type: String, default: '' },
  loading: Boolean,
  error: Boolean,
  /** default | alert — alert 用于 API Key 等需醒目提示的场景 */
  variant: { type: String, default: 'default' },
})

const emit = defineEmits(['close'])
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="visible"
        class="modal-overlay"
        :class="{ 'modal-overlay--alert': variant === 'alert' }"
        @click.self="emit('close')"
      >
        <div
          class="modal card"
          :class="{ 'modal--alert': variant === 'alert' }"
          role="dialog"
          aria-modal="true"
        >
          <div v-if="variant === 'alert'" class="modal-alert-bg" aria-hidden="true">
            <div class="modal-alert-grid" />
            <div class="modal-alert-glow modal-alert-glow--a" />
            <div class="modal-alert-glow modal-alert-glow--b" />
          </div>
          <header class="modal-header" :class="{ 'modal-header--alert': variant === 'alert' }">
            <h2>
              <template v-if="variant === 'alert'">
                <span class="modal-status-dot" aria-hidden="true" />
                <span class="modal-title-gradient">{{ title }}</span>
                <span class="modal-tech-badge">API</span>
              </template>
              <template v-else>{{ title }}</template>
            </h2>
            <button class="close-btn" type="button" aria-label="关闭" @click="emit('close')">
              ×
            </button>
          </header>
          <div
            class="modal-body"
            :class="{
              'modal-body--error': error && !loading,
              'modal-body--alert': variant === 'alert' && !loading,
            }"
          >
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

.modal-overlay--alert {
  background: var(--overlay);
  backdrop-filter: blur(8px);
}

.modal {
  width: 100%;
  max-width: 560px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.25s ease;
  position: relative;
  overflow: hidden;
}

.modal--alert {
  max-width: 420px;
  border: 1px solid var(--border-strong);
  background: var(--bg-panel);
  box-shadow:
    var(--shadow-lg),
    0 0 0 1px rgba(59, 130, 246, 0.15),
    0 0 40px var(--accent-glow);
  animation: slideUp 0.3s ease, modal-glow-pulse 3s ease-in-out infinite;
}

@keyframes modal-glow-pulse {
  0%,
  100% {
    box-shadow:
      var(--shadow-lg),
      0 0 0 1px rgba(59, 130, 246, 0.2),
      0 0 32px var(--accent-glow);
  }
  50% {
    box-shadow:
      var(--shadow-lg),
      0 0 0 1px rgba(139, 92, 246, 0.35),
      0 0 48px var(--purple-soft);
  }
}

.modal-alert-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.modal-alert-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--accent-soft) 1px, transparent 1px),
    linear-gradient(90deg, var(--accent-soft) 1px, transparent 1px);
  background-size: 20px 20px;
  mask-image: linear-gradient(180deg, black 0%, transparent 70%);
  opacity: 0.8;
}

.modal-alert-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(48px);
  opacity: 0.45;
}

.modal-alert-glow--a {
  width: 160px;
  height: 160px;
  top: -50px;
  right: -30px;
  background: var(--accent);
}

.modal-alert-glow--b {
  width: 120px;
  height: 120px;
  bottom: -20px;
  left: -40px;
  background: var(--purple);
  opacity: 0.35;
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
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border);
}

.modal-header h2 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  font-weight: 600;
}

.modal-header--alert {
  background: var(--ai-box-bg);
  border-bottom-color: var(--border-strong);
  backdrop-filter: blur(12px);
}

.modal-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent-hover);
  box-shadow: 0 0 12px var(--accent-glow);
  animation: status-pulse 2s ease-in-out infinite;
  flex-shrink: 0;
}

@keyframes status-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.55;
    transform: scale(0.88);
  }
}

.modal-title-gradient {
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  background: linear-gradient(90deg, var(--text) 0%, var(--accent-hover) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.modal-tech-badge {
  font-size: 0.6rem;
  font-weight: 700;
  font-family: ui-monospace, 'Cascadia Code', monospace;
  letter-spacing: 0.12em;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  color: var(--accent-hover);
  border: 1px solid var(--border-strong);
  background: var(--accent-soft);
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
  position: relative;
  z-index: 1;
  padding: 1.5rem;
  overflow-y: auto;
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-word;
}

.modal-body--alert {
  padding: 1.25rem 1.5rem 1.5rem;
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
