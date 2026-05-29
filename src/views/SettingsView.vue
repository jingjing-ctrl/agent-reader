<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppTopBar from '../components/AppTopBar.vue'
import { useSettingsStore } from '../stores/settings'

const router = useRouter()
const settings = useSettingsStore()
const apiKey = ref(settings.deepseekApiKey)
const saved = ref(false)
const showKey = ref(false)

const hasApiKey = computed(() => !!apiKey.value.trim())

function save() {
  settings.saveApiKey(apiKey.value)
  saved.value = true
  setTimeout(() => {
    saved.value = false
  }, 2000)
}

function goLibrary() {
  router.push({ name: 'library' })
}
</script>

<template>
  <div class="settings-app">
    <div class="page-ambient" aria-hidden="true">
      <div class="ambient-orb ambient-orb--a" />
      <div class="ambient-orb ambient-orb--b" />
      <div class="ambient-orb ambient-orb--c" />
      <div class="ambient-grid" />
    </div>

    <AppTopBar />

    <main class="settings-main">
      <header class="settings-hero">
        <div class="hero-text">
          <p class="hero-eyebrow">AgentReader · 智能阅读</p>
          <div class="hero-title-row">
            <h1>设置</h1>
            <span class="hero-count" :class="{ 'hero-count--muted': !hasApiKey }">
              {{ hasApiKey ? 'API 已配置' : 'API 未配置' }}
            </span>
          </div>
          <p class="hero-desc">管理 DeepSeek 密钥与阅读主题，配置仅保存在本机浏览器</p>
        </div>

        <div class="hero-actions">
          <button class="btn-back" type="button" @click="goLibrary">← 返回书架</button>
        </div>
      </header>

      <div class="settings-scroll">
        <div class="settings-grid">
          <section class="setting-card">
            <div class="card-head">
              <span class="card-icon card-icon--api" aria-hidden="true">🔑</span>
              <div>
                <h2>DeepSeek API</h2>
                <p class="card-desc">用于段落翻译与 AI 文学分析</p>
              </div>
            </div>

            <label class="field">
              <span class="field-label">API Key</span>
              <div class="field-input-wrap">
                <input
                  v-model="apiKey"
                  class="field-input"
                  :type="showKey ? 'text' : 'password'"
                  placeholder="sk-..."
                  autocomplete="off"
                  spellcheck="false"
                />
                <button
                  class="field-toggle"
                  type="button"
                  :title="showKey ? '隐藏' : '显示'"
                  @click="showKey = !showKey"
                >
                  {{ showKey ? '🙈' : '👁' }}
                </button>
              </div>
            </label>

            <div class="card-actions">
              <a
                class="card-link"
                href="https://platform.deepseek.com/api_keys"
                target="_blank"
                rel="noopener noreferrer"
              >
                获取 API Key →
              </a>
              <button
                class="btn-import"
                type="button"
                :class="{ 'btn-import--saved': saved }"
                @click="save"
              >
                {{ saved ? '已保存 ✓' : '保存配置' }}
              </button>
            </div>
          </section>

          <section class="setting-card">
            <div class="card-head">
              <span class="card-icon card-icon--theme" aria-hidden="true">🎨</span>
              <div>
                <h2>外观</h2>
                <p class="card-desc">选择浅色或深色阅读界面</p>
              </div>
            </div>

            <div class="theme-picks">
              <button
                class="theme-pick"
                :class="{ active: !settings.darkMode }"
                type="button"
                @click="settings.darkMode && settings.toggleDarkMode()"
              >
                <span class="theme-swatch theme-swatch--light" />
                <span>浅色</span>
              </button>
              <button
                class="theme-pick"
                :class="{ active: settings.darkMode }"
                type="button"
                @click="!settings.darkMode && settings.toggleDarkMode()"
              >
                <span class="theme-swatch theme-swatch--dark" />
                <span>深色</span>
              </button>
            </div>

            <div class="theme-row">
              <div>
                <p class="theme-row-title">深色模式</p>
                <p class="theme-row-hint">也可通过顶栏 🌙 快捷切换</p>
              </div>
              <button
                class="toggle"
                :class="{ active: settings.darkMode }"
                type="button"
                role="switch"
                :aria-checked="settings.darkMode"
                @click="settings.toggleDarkMode()"
              >
                <span class="toggle-thumb" />
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.settings-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  position: relative;
  background: var(--bg);
}

/* 与书架页一致的背景 */
.page-ambient {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}

.ambient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.45;
}

.ambient-orb--a {
  width: 420px;
  height: 420px;
  top: -120px;
  right: -80px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.35), transparent 70%);
}

.ambient-orb--b {
  width: 360px;
  height: 360px;
  bottom: 10%;
  left: -100px;
  background: radial-gradient(circle, rgba(14, 165, 233, 0.25), transparent 70%);
}

.ambient-orb--c {
  width: 280px;
  height: 280px;
  top: 40%;
  left: 45%;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.15), transparent 70%);
}

.ambient-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99, 102, 241, 0.03) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: linear-gradient(180deg, transparent 0%, black 15%, black 85%, transparent 100%);
}

[data-theme='light'] .ambient-orb {
  opacity: 0.55;
}

[data-theme='light'] .ambient-grid {
  background-image:
    linear-gradient(rgba(37, 99, 235, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(37, 99, 235, 0.04) 1px, transparent 1px);
}

.settings-main {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 1.75rem 2rem 0;
  max-width: 1280px;
  margin: 0 auto;
  width: 100%;
}

.settings-hero {
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.25rem 2rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid var(--border);
}

.hero-eyebrow {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent-hover);
  margin-bottom: 0.5rem;
  opacity: 0.85;
}

.hero-title-row {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.hero-text h1 {
  font-size: clamp(1.6rem, 3vw, 2rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.hero-count {
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent-hover);
  border: 1px solid var(--border);
}

.hero-count--muted {
  background: var(--bg-muted);
  color: var(--text-dim);
}

.hero-desc {
  margin-top: 0.5rem;
  color: var(--text-muted);
  font-size: 0.92rem;
  line-height: 1.55;
  max-width: 28rem;
}

.btn-back {
  display: inline-flex;
  align-items: center;
  padding: 0.65rem 1.25rem;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg-panel);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  transition: color 0.2s, border-color 0.2s, transform 0.2s;
}

.btn-back:hover {
  color: var(--accent-hover);
  border-color: var(--border-strong);
  transform: translateY(-1px);
}

.settings-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1.25rem 0 2rem;
  -webkit-overflow-scrolling: touch;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.25rem;
  align-content: start;
}

@media (max-width: 768px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
}

/* 与书架 book-card 一致 */
.setting-card {
  padding: 1.25rem;
  border-radius: 14px;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  transition: transform 0.28s cubic-bezier(0.34, 1.2, 0.64, 1), box-shadow 0.28s ease,
    border-color 0.2s;
}

.setting-card:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-lg);
}

.card-head {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  margin-bottom: 1.15rem;
}

.card-icon {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35rem;
  border-radius: 10px;
  background: var(--bg-muted);
  border: 1px solid var(--border);
}

.card-icon--api {
  background: var(--accent-soft);
}

.card-icon--theme {
  background: var(--purple-soft);
}

.card-head h2 {
  font-size: 0.95rem;
  font-weight: 600;
  margin-bottom: 0.2rem;
  line-height: 1.35;
}

.card-desc {
  font-size: 0.78rem;
  color: var(--text-dim);
  line-height: 1.45;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 1rem;
}

.field-label {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.field-input-wrap {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.15rem 0.15rem 0.15rem 0.75rem;
  border-radius: 10px;
  background: var(--bg-muted);
  border: 1px solid var(--border);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.field-input-wrap:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.field-input {
  flex: 1;
  min-width: 0;
  padding: 0.6rem 0;
  border: none;
  background: transparent;
  font-size: 0.88rem;
  color: var(--text);
  outline: none;
}

.field-input::placeholder {
  color: var(--text-dim);
}

.field-toggle {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.field-toggle:hover {
  background: var(--bg-hover);
}

.card-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.card-link {
  font-size: 0.85rem;
  color: var(--accent-hover);
}

.card-link:hover {
  text-decoration: underline;
}

.btn-import {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.55rem 1.15rem;
  border-radius: 12px;
  font-size: 0.88rem;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, var(--accent) 0%, var(--purple) 100%);
  box-shadow: 0 4px 16px var(--accent-glow), 0 1px 0 rgba(255, 255, 255, 0.15) inset;
  transition: transform 0.2s, box-shadow 0.2s, filter 0.2s;
}

.btn-import:hover {
  transform: translateY(-2px);
  filter: brightness(1.06);
  box-shadow: 0 8px 24px var(--accent-glow);
}

.btn-import--saved {
  background: linear-gradient(135deg, var(--success), #059669);
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
}

.theme-picks {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
  margin-bottom: 1rem;
}

.theme-pick {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
  padding: 0.75rem;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg-muted);
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--text-muted);
  transition: border-color 0.2s, background 0.2s, transform 0.2s;
}

.theme-pick:hover {
  border-color: var(--border-strong);
  transform: translateY(-2px);
}

.theme-pick.active {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent-hover);
}

.theme-swatch {
  width: 100%;
  height: 48px;
  border-radius: 8px;
  border: 1px solid var(--border);
}

.theme-swatch--light {
  background: linear-gradient(180deg, #f8fafc, #eef2f9);
}

.theme-swatch--dark {
  background: linear-gradient(180deg, #1e293b, #0f172a);
}

.theme-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 0.85rem;
  border-top: 1px solid var(--border);
}

.theme-row-title {
  font-size: 0.88rem;
  font-weight: 500;
  margin-bottom: 0.1rem;
}

.theme-row-hint {
  font-size: 0.72rem;
  color: var(--text-dim);
}

.toggle {
  width: 52px;
  height: 28px;
  border-radius: 14px;
  background: var(--bg-muted);
  border: 1px solid var(--border);
  position: relative;
  flex-shrink: 0;
  transition: background 0.2s, border-color 0.2s;
}

.toggle.active {
  background: linear-gradient(135deg, var(--accent), var(--purple));
  border-color: transparent;
}

.toggle-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
}

.toggle.active .toggle-thumb {
  transform: translateX(24px);
}

@media (max-width: 520px) {
  .settings-main {
    padding: 1.25rem 1.1rem 0;
  }

  .card-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .btn-import {
    width: 100%;
    justify-content: center;
  }
}
</style>
