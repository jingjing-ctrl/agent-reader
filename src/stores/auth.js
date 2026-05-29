import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const VALID_USER = 'admin'
const VALID_PASS = '123456'
const STORAGE_KEY = 'agent-reader-auth'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem(STORAGE_KEY) || '')

  const isLoggedIn = computed(() => !!token.value)

  function login(username, password) {
    if (username === VALID_USER && password === VALID_PASS) {
      token.value = 'session-' + Date.now()
      localStorage.setItem(STORAGE_KEY, token.value)
      return true
    }
    return false
  }

  function logout() {
    token.value = ''
    localStorage.removeItem(STORAGE_KEY)
  }

  return { token, isLoggedIn, login, logout }
})
