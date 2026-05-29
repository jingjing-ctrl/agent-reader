<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/settings'

const router = useRouter()
const auth = useAuthStore()
const settings = useSettingsStore()
const showUserMenu = ref(false)

function goSettings() {
  router.push({ name: 'settings' })
}

function goLibrary() {
  router.push({ name: 'library' })
}

function logout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <header class="topbar">
    <div class="topbar-left" @click="goLibrary">
      <div class="logo">
        <span class="logo-icon">📖</span>
        <span class="logo-text">AgentReader</span>
        <span class="badge">AI</span>
      </div>
    </div>

    <div class="topbar-right">
      <button
        class="btn btn-icon"
        type="button"
        :title="settings.darkMode ? '浅色模式' : '深色模式'"
        @click="settings.toggleDarkMode()"
      >
        {{ settings.darkMode ? '☀️' : '🌙' }}
      </button>
      <button class="btn btn-icon" type="button" title="设置" @click="goSettings">⚙️</button>
      <div class="user-wrap">
        <button
          class="avatar"
          type="button"
          @click="showUserMenu = !showUserMenu"
        >
          {{ auth.isLoggedIn ? 'A' : '?' }}
        </button>
        <div v-if="showUserMenu" class="user-menu glass-panel">
          <button type="button" @click="goLibrary">我的书架</button>
          <button type="button" @click="goSettings">API 设置</button>
          <button type="button" class="danger" @click="logout">退出登录</button>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  height: var(--topbar-height);
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 0 1.25rem;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  z-index: 50;
}

.topbar-left {
  cursor: pointer;
  flex-shrink: 0;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.logo-icon {
  font-size: 1.25rem;
}

.logo-text {
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-left: auto;
  flex-shrink: 0;
}

.user-wrap {
  position: relative;
  margin-left: 0.25rem;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), var(--purple));
  color: #fff;
  font-weight: 600;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 140px;
  padding: 0.35rem;
  z-index: 100;
}

.user-menu button {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.55rem 0.75rem;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  color: var(--text-muted);
}

.user-menu button:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.user-menu .danger {
  color: var(--danger);
}
</style>
