import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const KEY_STORAGE = 'agent-reader-deepseek-key'
const THEME_STORAGE = 'agent-reader-theme'
const FONT_SCALE_STORAGE = 'agent-reader-font-scale'

const FONT_SCALE_MIN = 80
const FONT_SCALE_MAX = 160
const FONT_SCALE_STEP = 10
const FONT_SCALE_DEFAULT = 100

function clampFontScale(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return FONT_SCALE_DEFAULT
  return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, Math.round(n)))
}

function readStoredFontScale() {
  const raw = localStorage.getItem(FONT_SCALE_STORAGE)
  if (raw == null) return FONT_SCALE_DEFAULT
  return clampFontScale(parseInt(raw, 10))
}

export const useSettingsStore = defineStore('settings', () => {
  const deepseekApiKey = ref(localStorage.getItem(KEY_STORAGE) || '')
  const storedTheme = localStorage.getItem(THEME_STORAGE)
  const darkMode = ref(storedTheme ? storedTheme === 'dark' : true)
  const fontScale = ref(readStoredFontScale())

  function applyTheme() {
    document.documentElement.dataset.theme = darkMode.value ? 'dark' : 'light'
  }

  applyTheme()

  watch(darkMode, (val) => {
    localStorage.setItem(THEME_STORAGE, val ? 'dark' : 'light')
    applyTheme()
  })

  function saveApiKey(key) {
    deepseekApiKey.value = key.trim()
    localStorage.setItem(KEY_STORAGE, deepseekApiKey.value)
  }

  function toggleDarkMode() {
    darkMode.value = !darkMode.value
  }

  function setFontScale(value) {
    fontScale.value = clampFontScale(value)
    localStorage.setItem(FONT_SCALE_STORAGE, String(fontScale.value))
  }

  function adjustFontScale(delta) {
    setFontScale(fontScale.value + delta)
  }

  function resetFontScale() {
    setFontScale(FONT_SCALE_DEFAULT)
  }

  return {
    deepseekApiKey,
    darkMode,
    fontScale,
    fontScaleMin: FONT_SCALE_MIN,
    fontScaleMax: FONT_SCALE_MAX,
    fontScaleStep: FONT_SCALE_STEP,
    saveApiKey,
    toggleDarkMode,
    setFontScale,
    adjustFontScale,
    resetFontScale,
    applyTheme,
  }
})
