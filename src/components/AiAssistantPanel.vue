<script setup>
import { computed } from 'vue'

const props = defineProps({
  hasSelection: Boolean,
  selectedText: { type: String, default: '' },
  selectedType: { type: String, default: 'p' },
  analysisContent: { type: String, default: '' },
  analysisLoading: Boolean,
  analysisError: Boolean,
})

const emit = defineEmits(['analyze'])

const selectionTextClass = computed(() => {
  const type = props.selectedType || 'p'
  if (['h1', 'h2', 'h3', 'h4'].includes(type)) return `selection-text selection-text--${type}`
  return 'selection-text'
})
</script>

<template>
  <aside class="ai-panel">
    <div class="panel-bg" aria-hidden="true">
      <div class="grid-overlay" />
      <div class="glow glow-a" />
      <div class="glow glow-b" />
    </div>

    <div class="panel-header">
      <div class="header-brand">
        <span class="status-dot" />
        <h2>AI 助手</h2>
        <span class="tech-badge">NEURAL</span>
      </div>
    </div>

    <div class="panel-body" :class="{ 'panel-body--split': hasSelection }">
      <template v-if="hasSelection">
        <section v-if="selectedText" class="tech-card selection-card">
          <div class="action-card__head">
            <span class="step-num">00</span>
            <div class="action-card__meta">
              <span class="card-title">选中段落</span>
              <span class="action-card__desc">当前分析对象</span>
            </div>
          </div>
          <div class="selection-quote scroll-area">
            <p :class="selectionTextClass">{{ selectedText }}</p>
          </div>
        </section>

        <section
          class="tech-card action-card action-card--analysis"
          :class="{ 'action-card--expanded': analysisLoading || analysisContent }"
        >
          <div class="action-card__head">
            <span class="step-num">01</span>
            <div class="action-card__meta">
              <span class="card-title">智能分析</span>
              <span class="action-card__desc">段落结构、主题与修辞解读</span>
            </div>
          </div>
          <button
            class="action-btn action-btn--primary"
            type="button"
            :disabled="analysisLoading"
            @click="emit('analyze')"
          >
            <span class="action-btn__icon" aria-hidden="true">◈</span>
            <span class="action-btn__label">{{ analysisLoading ? '分析中…' : 'AI 分析' }}</span>
            <span v-if="analysisLoading" class="action-btn__spinner" />
            <span v-else class="action-btn__arrow" aria-hidden="true">→</span>
          </button>
          <div
            v-if="analysisLoading || analysisContent"
            class="analysis-result-grow"
            :class="{
              'analysis-result-grow--loading': analysisLoading,
              'analysis-result-grow--done': analysisContent && !analysisLoading,
            }"
          >
            <div
              class="result-terminal"
              :class="{
                'result-terminal--loading': analysisLoading,
                'result-terminal--error': analysisError,
              }"
            >
              <div class="terminal-deco" aria-hidden="true">
                <span class="corner corner-tl" />
                <span class="corner corner-tr" />
                <span class="corner corner-bl" />
                <span class="corner corner-br" />
                <div class="terminal-grid" />
                <div class="terminal-scanline" />
              </div>

              <div class="terminal-header">
                <span class="terminal-tag">DEEPSEEK-V3</span>
                <span v-if="analysisLoading" class="terminal-live">
                  <span class="live-dot" />
                  LIVE
                </span>
                <span v-else class="terminal-live terminal-live--ok">DONE</span>
              </div>

              <div
                class="terminal-scroll scroll-area"
                :class="{ 'terminal-scroll--loading': analysisLoading }"
              >
                <template v-if="analysisLoading">
                  <div class="terminal-bar">
                    <div class="terminal-bar-fill" />
                  </div>
                  <div class="tech-loading">
                    <div class="tech-ring">
                      <div class="tech-ring-core" />
                    </div>
                    <p class="tech-loading-title">
                      <span class="glow-text">DeepSeek 正在解读…</span>
                    </p>
                    <p class="tech-loading-sub">STRUCTURE · THEME · RHETORIC</p>
                  </div>
                </template>
                <p v-else class="result-text" :class="{ error: analysisError }">{{ analysisContent }}</p>
              </div>
            </div>
          </div>
        </section>
      </template>

      <div v-else class="empty-state">
        <div class="empty-orb">
          <div class="orb-ring orb-ring-1" />
          <div class="orb-ring orb-ring-2" />
          <div class="orb-core">AI</div>
        </div>
        <p class="empty-hint">点击左侧段落以激活 AI 助手</p>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.ai-panel {
  --ai-cyan: #22d3ee;
  --ai-blue: #3b82f6;
  --ai-purple: #a78bfa;
  --ai-border: rgba(59, 130, 246, 0.25);
  --ai-glass: rgba(15, 23, 42, 0.65);

  width: var(--ai-panel-width);
  flex-shrink: 0;
  align-self: stretch;
  height: 100%;
  max-height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  border-left: 1px solid var(--ai-border);
  background: linear-gradient(180deg, #0c1222 0%, #0a0f1c 50%, #0d1324 100%);
}

[data-theme='light'] .ai-panel {
  --ai-glass: rgba(255, 255, 255, 0.85);
  --ai-border: rgba(37, 99, 235, 0.2);
  background: linear-gradient(180deg, #f0f4ff 0%, #e8eeff 50%, #f5f7fc 100%);
}

.panel-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.grid-overlay {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(59, 130, 246, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(59, 130, 246, 0.04) 1px, transparent 1px);
  background-size: 24px 24px;
  mask-image: linear-gradient(180deg, black 0%, transparent 85%);
}

.glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.5;
}

.glow-a {
  width: 180px;
  height: 180px;
  top: -40px;
  right: -40px;
  background: var(--ai-blue);
}

.glow-b {
  width: 140px;
  height: 140px;
  bottom: 20%;
  left: -50px;
  background: var(--ai-purple);
  opacity: 0.35;
}

.panel-header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  padding: 1rem 1.15rem;
  flex-shrink: 0;
  border-bottom: 1px solid var(--ai-border);
  background: var(--ai-glass);
  backdrop-filter: blur(12px);
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--ai-cyan);
  box-shadow: 0 0 12px var(--ai-cyan);
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(0.9);
  }
}

.panel-header h2 {
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  background: linear-gradient(90deg, var(--text), var(--ai-cyan));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

[data-theme='light'] .panel-header h2 {
  background: linear-gradient(90deg, #0f172a, var(--ai-blue));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.tech-badge {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
  color: var(--ai-cyan);
  border: 1px solid rgba(34, 211, 238, 0.35);
  background: rgba(34, 211, 238, 0.08);
}

.panel-body {
  position: relative;
  z-index: 1;
  flex: 1 1 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: rgba(59, 130, 246, 0.4) transparent;
  padding: 1rem 1.15rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  min-height: 0;
}

.panel-body::-webkit-scrollbar {
  width: 6px;
}

.panel-body::-webkit-scrollbar-track {
  background: transparent;
}

.panel-body::-webkit-scrollbar-thumb {
  background: rgba(59, 130, 246, 0.35);
  border-radius: 3px;
}

.panel-body::-webkit-scrollbar-thumb:hover {
  background: rgba(59, 130, 246, 0.55);
}

[data-theme='light'] .panel-body::-webkit-scrollbar-thumb {
  background: rgba(37, 99, 235, 0.3);
}

.panel-body--split {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.selection-card {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.selection-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  border-radius: 12px 0 0 12px;
  background: linear-gradient(180deg, var(--ai-cyan), var(--ai-blue));
  opacity: 0.85;
}

.selection-quote {
  flex: 0 0 auto;
  height: auto;
  max-height: 180px;
  padding: 0.75rem 0.85rem;
  border-radius: 8px;
  border: 1px solid rgba(34, 211, 238, 0.18);
  background: rgba(15, 23, 42, 0.45);
  overflow-x: hidden;
  overflow-y: auto;
}

[data-theme='light'] .selection-quote {
  background: rgba(255, 255, 255, 0.75);
  border-color: rgba(37, 99, 235, 0.18);
}

.selection-text {
  margin: 0;
  font-size: 0.84rem;
  line-height: 1.75;
  color: var(--text);
  white-space: pre-wrap;
  word-break: break-word;
}

.selection-text--h1 {
  font-size: 1.05rem;
  font-weight: 700;
}

.selection-text--h2 {
  font-size: 0.98rem;
  font-weight: 700;
}

.selection-text--h3,
.selection-text--h4 {
  font-size: 0.92rem;
  font-weight: 600;
}

.panel-body--split .action-card--analysis {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.panel-body--split .action-card--analysis:not(.action-card--expanded) {
  flex: 0 0 auto;
}

.analysis-result-grow {
  display: flex;
  flex-direction: column;
  margin-top: 0.55rem;
}

.analysis-result-grow--loading {
  flex: 0 0 auto;
}

.analysis-result-grow--done {
  flex: 1 1 0;
  min-height: 0;
}

.scroll-area {
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: rgba(59, 130, 246, 0.4) transparent;
}

.scroll-area::-webkit-scrollbar {
  width: 5px;
}

.scroll-area::-webkit-scrollbar-track {
  background: transparent;
}

.scroll-area::-webkit-scrollbar-thumb {
  background: rgba(59, 130, 246, 0.35);
  border-radius: 3px;
}

.scroll-area::-webkit-scrollbar-thumb:hover {
  background: rgba(59, 130, 246, 0.55);
}

[data-theme='light'] .scroll-area::-webkit-scrollbar-thumb {
  background: rgba(37, 99, 235, 0.3);
}

.tech-card {
  padding: 0.85rem;
  border-radius: 12px;
  border: 1px solid var(--ai-border);
  background: var(--ai-glass);
  backdrop-filter: blur(10px);
  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  transition: border-color 0.3s, box-shadow 0.3s;
}

[data-theme='light'] .tech-card {
  box-shadow: 0 4px 20px rgba(37, 99, 235, 0.08);
}

.card-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.65rem;
}

.step-num {
  font-size: 0.65rem;
  font-weight: 700;
  font-family: ui-monospace, 'Cascadia Code', monospace;
  color: var(--ai-cyan);
  opacity: 0.9;
  letter-spacing: 0.05em;
}

.card-title {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

/* 操作卡片：分析 */
.action-card {
  padding: 0.75rem 0.85rem;
  position: relative;
  overflow: hidden;
}

.action-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  border-radius: 12px 0 0 12px;
  opacity: 0.85;
}

.action-card--analysis::before {
  background: linear-gradient(180deg, var(--ai-blue), var(--ai-purple));
}

.action-card--translate::before {
  background: linear-gradient(180deg, var(--ai-cyan), var(--ai-blue));
}

.action-card__head {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  margin-bottom: 0.6rem;
}

.action-card__meta {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.action-card .card-title {
  font-size: 0.8rem;
  text-transform: none;
  letter-spacing: 0.02em;
  color: var(--text);
  font-weight: 600;
}

.action-card__desc {
  font-size: 0.72rem;
  line-height: 1.4;
  color: var(--text-dim);
}

.action-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.65rem 0.5rem 0.5rem;
  border-radius: 10px;
  font-size: 0.86rem;
  font-weight: 500;
  border: 1px solid transparent;
  transition:
    border-color 0.25s,
    background 0.25s,
    box-shadow 0.25s,
    transform 0.2s;
}

.action-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.action-btn__icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 0.95rem;
  line-height: 1;
}

.action-btn__label {
  flex: 1;
  text-align: left;
  min-width: 0;
}

.action-btn__arrow {
  flex-shrink: 0;
  font-size: 0.85rem;
  opacity: 0.45;
  transition: opacity 0.2s, transform 0.2s;
}

.action-btn:hover:not(:disabled) .action-btn__arrow {
  opacity: 0.85;
  transform: translateX(2px);
}

.action-btn--primary {
  color: #e8f0ff;
  border-color: rgba(59, 130, 246, 0.45);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.35), rgba(99, 102, 241, 0.28));
  box-shadow: 0 2px 12px rgba(59, 130, 246, 0.2);
}

.action-btn--primary .action-btn__icon {
  color: var(--ai-cyan);
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.action-btn--primary:hover:not(:disabled) {
  border-color: rgba(34, 211, 238, 0.55);
  box-shadow: 0 4px 20px rgba(59, 130, 246, 0.35);
}

[data-theme='light'] .action-btn--primary {
  color: #1e40af;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.14), rgba(139, 92, 246, 0.1));
  box-shadow: 0 2px 10px rgba(37, 99, 235, 0.12);
}

[data-theme='light'] .action-btn--primary .action-btn__icon {
  color: var(--ai-blue);
  background: rgba(59, 130, 246, 0.12);
  border-color: rgba(59, 130, 246, 0.2);
}

.action-btn--secondary {
  color: var(--text);
  border-color: var(--ai-border);
  background: rgba(15, 23, 42, 0.35);
}

.action-btn--secondary .action-btn__icon {
  color: var(--ai-cyan);
  background: rgba(34, 211, 238, 0.1);
  border: 1px solid rgba(34, 211, 238, 0.22);
}

.action-btn--secondary:hover:not(:disabled) {
  border-color: rgba(34, 211, 238, 0.4);
  background: rgba(34, 211, 238, 0.08);
  box-shadow: 0 2px 14px rgba(34, 211, 238, 0.12);
}

[data-theme='light'] .action-btn--secondary {
  color: #1e3a5f;
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(37, 99, 235, 0.22);
}

[data-theme='light'] .action-btn--secondary .action-btn__icon {
  color: var(--ai-blue);
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.25);
}

[data-theme='light'] .action-btn--secondary:hover:not(:disabled) {
  border-color: rgba(37, 99, 235, 0.45);
  background: rgba(59, 130, 246, 0.06);
}

.action-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.action-btn__spinner {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-top-color: var(--ai-cyan);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

[data-theme='light'] .action-btn__spinner {
  border-color: rgba(37, 99, 235, 0.15);
  border-top-color: var(--ai-blue);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 终端风格结果区 */
.result-terminal {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 0.85rem 1rem 1rem;
  border-radius: 10px;
  border: 1px solid rgba(34, 211, 238, 0.28);
  background:
    linear-gradient(165deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 41, 59, 0.88) 100%);
  box-shadow:
    0 0 0 1px rgba(59, 130, 246, 0.08) inset,
    0 8px 32px rgba(59, 130, 246, 0.12),
    0 0 24px rgba(34, 211, 238, 0.06);
  overflow: hidden;
}

[data-theme='light'] .result-terminal {
  border-color: rgba(37, 99, 235, 0.35);
  background: linear-gradient(165deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 245, 255, 0.92) 100%);
  box-shadow:
    0 0 0 1px rgba(59, 130, 246, 0.1) inset,
    0 8px 28px rgba(37, 99, 235, 0.1);
}

.result-terminal--loading {
  min-height: 188px;
  max-height: 220px;
  flex: 0 0 auto;
}

.analysis-result-grow--done .result-terminal {
  flex: 1 1 0;
  min-height: 200px;
  max-height: 100%;
  height: auto;
}

.result-terminal--error {
  border-color: rgba(248, 113, 113, 0.45);
  box-shadow: 0 0 20px rgba(248, 113, 113, 0.08);
}

.terminal-deco {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  overflow: hidden;
}

.terminal-scroll {
  position: relative;
  z-index: 1;
  flex: 1 1 0;
  min-height: 0;
}

.terminal-scroll--loading {
  flex: 0 0 auto;
  overflow: visible;
}

.corner {
  position: absolute;
  width: 12px;
  height: 12px;
  border-color: var(--ai-cyan);
  border-style: solid;
  opacity: 0.75;
}

.corner-tl {
  top: 6px;
  left: 6px;
  border-width: 2px 0 0 2px;
}

.corner-tr {
  top: 6px;
  right: 6px;
  border-width: 2px 2px 0 0;
}

.corner-bl {
  bottom: 6px;
  left: 6px;
  border-width: 0 0 2px 2px;
}

.corner-br {
  bottom: 6px;
  right: 6px;
  border-width: 0 2px 2px 0;
}

.terminal-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(34, 211, 238, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(34, 211, 238, 0.04) 1px, transparent 1px);
  background-size: 16px 16px;
  mask-image: linear-gradient(180deg, black 0%, transparent 90%);
}

.terminal-scanline {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--ai-cyan), transparent);
  opacity: 0.5;
  animation: scanline-move 2.5s ease-in-out infinite;
}

@keyframes scanline-move {
  0% {
    top: 0;
    opacity: 0;
  }
  15% {
    opacity: 0.6;
  }
  85% {
    opacity: 0.6;
  }
  100% {
    top: 100%;
    opacity: 0;
  }
}

.terminal-header {
  position: relative;
  z-index: 3;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.65rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(34, 211, 238, 0.15);
}

.terminal-tag {
  font-size: 0.62rem;
  font-weight: 700;
  font-family: ui-monospace, 'Cascadia Code', monospace;
  letter-spacing: 0.14em;
  color: var(--ai-cyan);
}

.terminal-live {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.6rem;
  font-weight: 700;
  font-family: ui-monospace, monospace;
  letter-spacing: 0.1em;
  color: var(--ai-cyan);
}

.terminal-live--ok {
  color: var(--success);
}

.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ai-cyan);
  box-shadow: 0 0 8px var(--ai-cyan);
  animation: live-blink 1.2s ease-in-out infinite;
}

@keyframes live-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

.terminal-bar {
  position: relative;
  z-index: 1;
  height: 3px;
  margin-bottom: 0.75rem;
  border-radius: 2px;
  background: rgba(34, 211, 238, 0.12);
  overflow: hidden;
}

.terminal-bar-fill {
  height: 100%;
  width: 35%;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--ai-blue), var(--ai-cyan), var(--ai-purple));
  box-shadow: 0 0 12px rgba(34, 211, 238, 0.5);
  animation: bar-scan 1.4s ease-in-out infinite;
}

@keyframes bar-scan {
  0% {
    transform: translateX(-120%);
  }
  100% {
    transform: translateX(380%);
  }
}

.tech-loading {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 0 0.25rem;
  gap: 0.65rem;
}

.tech-ring {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid rgba(34, 211, 238, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ring-spin 3s linear infinite;
}

.tech-ring::before {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  border: 2px solid transparent;
  border-top-color: var(--ai-cyan);
  border-right-color: rgba(139, 92, 246, 0.6);
}

.tech-ring-core {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--ai-cyan);
  box-shadow: 0 0 14px var(--ai-cyan);
  animation: core-pulse 1.5s ease-in-out infinite;
}

@keyframes ring-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes core-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(0.85);
    opacity: 0.7;
  }
}

.tech-loading-title {
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--text);
}

.glow-text {
  background: linear-gradient(90deg, var(--text), var(--ai-cyan), var(--text));
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: text-shimmer 2.5s linear infinite;
}

@keyframes text-shimmer {
  to {
    background-position: 200% center;
  }
}

.tech-loading-sub {
  font-size: 0.62rem;
  font-family: ui-monospace, monospace;
  letter-spacing: 0.18em;
  color: var(--text-dim);
  opacity: 0.85;
}

.result-text {
  position: relative;
  z-index: 1;
  font-size: 0.84rem;
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--text-muted);
}

.result-text.error {
  color: var(--danger);
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2.5rem 1rem;
}

.empty-orb {
  position: relative;
  width: 88px;
  height: 88px;
  margin-bottom: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.orb-ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.orb-ring-1 {
  inset: 0;
  animation: orb-spin 8s linear infinite;
}

.orb-ring-2 {
  inset: 12px;
  border-color: rgba(139, 92, 246, 0.35);
  animation: orb-spin 6s linear infinite reverse;
}

@keyframes orb-spin {
  to {
    transform: rotate(360deg);
  }
}

.orb-core {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--ai-cyan);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(139, 92, 246, 0.2));
  border: 1px solid rgba(34, 211, 238, 0.4);
  box-shadow: 0 0 24px rgba(59, 130, 246, 0.3);
}

.empty-hint {
  font-size: 0.78rem;
  color: var(--text-dim);
}

</style>
