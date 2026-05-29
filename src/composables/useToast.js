import { reactive } from 'vue'

const state = reactive({
  visible: false,
  mode: 'message',
  type: 'info',
  message: '',
  confirmKind: 'book',
  onConfirm: null,
})

let timer = null

function clearTimer() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

function hide() {
  clearTimer()
  state.visible = false
  state.onConfirm = null
}

function showMessage(message, { type = 'info', duration = 2800 } = {}) {
  clearTimer()
  state.mode = 'message'
  state.message = message
  state.type = type
  state.visible = true
  timer = setTimeout(hide, duration)
}

function showDeleteConfirm(book, onConfirm) {
  clearTimer()
  state.mode = 'confirm'
  state.confirmKind = 'book'
  state.message = book.title || book.fileName || '未命名'
  state.onConfirm = onConfirm
  state.visible = true
}

function showGroupDeleteConfirm(group, onConfirm) {
  clearTimer()
  state.mode = 'confirm'
  state.confirmKind = 'group'
  state.message = group.name || '未命名分组'
  state.onConfirm = onConfirm
  state.visible = true
}

function showBatchDeleteConfirm(count, onConfirm) {
  clearTimer()
  state.mode = 'confirm'
  state.confirmKind = 'batch'
  state.message = String(count)
  state.onConfirm = onConfirm
  state.visible = true
}

function confirmDelete() {
  const title = state.message
  const kind = state.confirmKind
  state.onConfirm?.()
  hide()
  if (kind === 'group') {
    showMessage(`已删除分组「${title}」`, { type: 'success' })
  } else if (kind === 'batch') {
    showMessage(`已删除 ${title} 本书`, { type: 'success' })
  } else {
    showMessage(`已删除「${title}」`, { type: 'success' })
  }
}

function cancelDelete() {
  hide()
}

export function useToast() {
  return {
    state,
    showMessage,
    showSuccess: (msg) => showMessage(msg, { type: 'success' }),
    showError: (msg) => showMessage(msg, { type: 'error', duration: 3500 }),
    showDeleteConfirm,
    showGroupDeleteConfirm,
    showBatchDeleteConfirm,
    confirmDelete,
    cancelDelete,
    hide,
  }
}
