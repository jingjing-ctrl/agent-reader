<script setup>
import { useToast } from '../composables/useToast'

const toast = useToast()
</script>

<template>
  <Teleport to="body">
    <Transition name="toast-slide">
      <div v-if="toast.state.visible" class="toast-host" role="status">
        <div
          class="toast"
          :class="[`toast--${toast.state.mode}`, toast.state.mode === 'message' && `toast--${toast.state.type}`]"
        >
          <template v-if="toast.state.mode === 'confirm'">
            <div class="toast-icon toast-icon--warn">
              {{ toast.state.confirmKind === 'group' ? '📁' : '🗑️' }}
            </div>
            <div class="toast-body">
              <p class="toast-title">
                {{
                  toast.state.confirmKind === 'group'
                    ? '删除分组？'
                    : toast.state.confirmKind === 'batch'
                      ? '批量删除？'
                      : '删除此书？'
                }}
              </p>
              <p class="toast-desc">
                <template v-if="toast.state.confirmKind === 'group'">
                  「{{ toast.state.message }}」中的书将移至「未分组」
                </template>
                <template v-else-if="toast.state.confirmKind === 'batch'">
                  将从书架移除选中的 {{ toast.state.message }} 本书，此操作不可恢复
                </template>
                <template v-else>
                  《{{ toast.state.message }}》将从书架移除
                </template>
              </p>
            </div>
            <div class="toast-actions">
              <button class="toast-btn toast-btn--ghost" type="button" @click="toast.cancelDelete()">
                取消
              </button>
              <button class="toast-btn toast-btn--danger" type="button" @click="toast.confirmDelete()">
                删除
              </button>
            </div>
          </template>

          <template v-else>
            <span class="toast-icon">
              {{ toast.state.type === 'success' ? '✓' : toast.state.type === 'error' ? '!' : 'ℹ' }}
            </span>
            <span class="toast-msg">{{ toast.state.message }}</span>
            <button class="toast-close" type="button" aria-label="关闭" @click="toast.hide()">×</button>
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.toast-host {
  position: fixed;
  top: 1.25rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  width: min(420px, calc(100vw - 2rem));
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 1.1rem;
  border-radius: 14px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-strong);
  box-shadow: var(--shadow-lg), 0 0 40px rgba(59, 130, 246, 0.12);
  backdrop-filter: blur(16px);
}

.toast--confirm {
  flex-wrap: wrap;
  padding: 1rem 1.15rem;
  border-color: rgba(248, 113, 113, 0.35);
  background: linear-gradient(135deg, var(--bg-elevated), rgba(248, 113, 113, 0.06));
}

.toast--success {
  border-color: rgba(52, 211, 153, 0.35);
  background: linear-gradient(135deg, var(--bg-elevated), rgba(52, 211, 153, 0.08));
}

.toast--error {
  border-color: rgba(248, 113, 113, 0.4);
}

.toast-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: 700;
  flex-shrink: 0;
  background: var(--accent-soft);
  color: var(--accent-hover);
}

.toast--success .toast-icon {
  background: rgba(52, 211, 153, 0.15);
  color: var(--success);
}

.toast--error .toast-icon {
  background: rgba(248, 113, 113, 0.12);
  color: var(--danger);
}

.toast-icon--warn {
  background: rgba(248, 113, 113, 0.12);
  font-size: 1rem;
}

.toast-body {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-size: 0.92rem;
  font-weight: 600;
  margin-bottom: 0.15rem;
}

.toast-desc {
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1.45;
}

.toast-msg {
  flex: 1;
  font-size: 0.9rem;
}

.toast-actions {
  display: flex;
  gap: 0.5rem;
  width: 100%;
  justify-content: flex-end;
  margin-top: 0.25rem;
}

.toast-btn {
  padding: 0.4rem 0.9rem;
  font-size: 0.82rem;
  font-weight: 500;
  border-radius: 8px;
  transition: all 0.2s;
}

.toast-btn--ghost {
  color: var(--text-muted);
  border: 1px solid var(--border);
}

.toast-btn--ghost:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.toast-btn--danger {
  background: var(--danger);
  color: #fff;
}

.toast-btn--danger:hover {
  filter: brightness(1.08);
}

.toast-close {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  color: var(--text-dim);
  font-size: 1.1rem;
  line-height: 1;
  flex-shrink: 0;
}

.toast-close:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.toast-slide-enter-active,
.toast-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.2, 0.64, 1);
}

.toast-slide-enter-from,
.toast-slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-12px) scale(0.96);
}

.toast-slide-enter-to,
.toast-slide-leave-from {
  transform: translateX(-50%) translateY(0) scale(1);
}
</style>
