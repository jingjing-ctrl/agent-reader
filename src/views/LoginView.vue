<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const REMEMBER_KEY = 'agent-reader-login-remember'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const remember = ref(false)
const showPassword = ref(false)
const error = ref('')
const loading = ref(false)
const heroSlide = ref(0)

const heroSlides = [
  {
    quote: '读书在于求知，思考在于明理。',
    author: '本杰明·富兰克林',
  },
  {
    quote: '阅读是一座随身携带的避难所。',
    author: '毛姆',
  },
]

let slideTimer

onMounted(() => {
  const saved = localStorage.getItem(REMEMBER_KEY)
  if (saved) {
    try {
      const data = JSON.parse(saved)
      username.value = data.username || ''
      remember.value = true
    } catch {
      /* ignore */
    }
  }
  slideTimer = window.setInterval(() => {
    heroSlide.value = (heroSlide.value + 1) % heroSlides.length
  }, 6000)
})

onUnmounted(() => {
  clearInterval(slideTimer)
})

function submit() {
  error.value = ''
  loading.value = true
  const user = username.value.trim()
  const ok = auth.login(user, password.value)
  loading.value = false

  if (ok) {
    if (remember.value) {
      localStorage.setItem(REMEMBER_KEY, JSON.stringify({ username: user }))
    } else {
      localStorage.removeItem(REMEMBER_KEY)
    }
    const redirect = route.query.redirect || '/'
    router.replace(redirect)
  } else {
    error.value = '账号或密码错误'
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-bg" aria-hidden="true">
      <div class="bg-grid" />
      <div class="bg-glow bg-glow-a" />
      <div class="bg-glow bg-glow-b" />
      <div class="bg-particles" />
    </div>

    <div class="login-layout">
      <!-- 左侧品牌区 -->
      <section class="login-hero">
        <div class="hero-brand">
          <div class="hero-logo">
            <span class="hero-logo-icon" aria-hidden="true">📖</span>
          </div>
          <div>
            <h1 class="hero-logo-text">AgentReader</h1>
            <p class="hero-tagline">AI · 阅读 · 思考</p>
          </div>
        </div>

        <h2 class="hero-title">
          让阅读 <span class="hero-title-accent">因思考</span> 而更有价值
        </h2>
        <p class="hero-desc">
          AgentReader 不仅是一个阅读器，更是你探索知识、理解世界的智能伙伴。
        </p>

        <ul class="hero-features">
          <li>
            <span class="feat-icon feat-icon--purple">◈</span>
            <div>
              <strong>AI 深度理解</strong>
              <span>段落分析、翻译与智能问答</span>
            </div>
          </li>
          <li>
            <span class="feat-icon feat-icon--blue">◎</span>
            <div>
              <strong>沉浸式阅读</strong>
              <span>连续滚动、虚拟列表式翻页体验</span>
            </div>
          </li>
          <li>
            <span class="feat-icon feat-icon--green">◇</span>
            <div>
              <strong>知识联结</strong>
              <span>跨页上下文衔接，思考不断档</span>
            </div>
          </li>
        </ul>

        <div class="hero-visual" aria-hidden="true">
          <div class="portal-ring portal-ring-3" />
          <div class="portal-ring portal-ring-2" />
          <div class="portal-ring portal-ring-1" />
          <div class="portal-core">
            <div class="portal-sky" />
            <div class="portal-figure" />
          </div>
          <span class="float-tag tag-1">总结</span>
          <span class="float-tag tag-2">翻译</span>
          <span class="float-tag tag-3">解析</span>
          <span class="float-tag tag-5">联想</span>
        </div>

        <blockquote class="hero-quote">
          <p>「{{ heroSlides[heroSlide].quote }}」</p>
          <cite>— {{ heroSlides[heroSlide].author }}</cite>
        </blockquote>

        <div class="hero-dots" aria-hidden="true">
          <span
            v-for="(_, i) in heroSlides"
            :key="i"
            class="dot"
            :class="{ active: heroSlide === i }"
          />
        </div>
      </section>

      <!-- 右侧登录区 -->
      <section class="login-panel-wrap">
        <div class="login-card">
          <h2 class="card-title">欢迎回来</h2>
          <p class="card-subtitle">登录 AgentReader，开启智能阅读之旅</p>

          <form class="login-form" @submit.prevent="submit">
            <label class="field">
              <span class="field-icon" aria-hidden="true">👤</span>
              <input
                v-model="username"
                type="text"
                autocomplete="username"
                placeholder="请输入账号"
              />
            </label>
            <label class="field">
              <span class="field-icon" aria-hidden="true">🔒</span>
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="请输入密码"
              />
              <button
                class="field-toggle"
                type="button"
                :title="showPassword ? '隐藏密码' : '显示密码'"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? '🙈' : '👁' }}
              </button>
            </label>

            <div class="form-row">
              <label class="remember">
                <input v-model="remember" type="checkbox" />
                <span>记住我</span>
              </label>
            </div>

            <p v-if="error" class="error-msg">{{ error }}</p>

            <button class="btn-login" type="submit" :disabled="loading">
              {{ loading ? '登录中…' : '登 录' }}
            </button>
          </form>

          <p class="demo-hint">演示账号：admin / 123456</p>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  --login-bg: #f0f4fc;
  --login-bg-soft: #e8eef9;
  --login-card: rgba(255, 255, 255, 0.92);
  --login-border: rgba(99, 102, 241, 0.18);
  --login-purple: #7c3aed;
  --login-purple-bright: #6d28d9;
  --login-blue: #2563eb;
  --login-text: #0f172a;
  --login-muted: #64748b;

  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--login-bg);
  color: var(--login-text);
  position: relative;
  overflow: hidden;
}

.login-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(99, 102, 241, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99, 102, 241, 0.06) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse 80% 70% at 30% 50%, black, transparent);
}

.bg-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
}

.bg-glow-a {
  width: 520px;
  height: 520px;
  background: rgba(147, 197, 253, 0.45);
  top: -120px;
  left: -80px;
}

.bg-glow-b {
  width: 420px;
  height: 420px;
  background: rgba(196, 181, 253, 0.4);
  bottom: -100px;
  right: 10%;
}

.bg-particles {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(1px 1px at 20% 30%, rgba(99, 102, 241, 0.12), transparent),
    radial-gradient(1px 1px at 60% 70%, rgba(139, 92, 246, 0.1), transparent),
    radial-gradient(1px 1px at 80% 20%, rgba(59, 130, 246, 0.1), transparent);
  opacity: 0.8;
}

.login-layout {
  position: relative;
  z-index: 1;
  flex: 1;
  display: grid;
  grid-template-columns: 1fr minmax(380px, 460px);
  gap: 2rem;
  align-items: center;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 1rem 2.5rem 2rem;
}

.login-hero {
  padding-right: 1rem;
}

.hero-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 2rem;
}

.hero-logo {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--login-purple), var(--login-blue));
  box-shadow: 0 0 24px rgba(139, 92, 246, 0.45);
}

.hero-logo-icon {
  font-size: 1.35rem;
}

.hero-logo-text {
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.hero-tagline {
  font-size: 0.78rem;
  color: var(--login-muted);
  margin-top: 0.1rem;
}

.hero-title {
  font-size: clamp(1.75rem, 3.2vw, 2.35rem);
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.03em;
  margin-bottom: 1rem;
}

.hero-title-accent {
  background: linear-gradient(90deg, #6d28d9, #7c3aed, #4f46e5);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-desc {
  font-size: 0.92rem;
  line-height: 1.7;
  color: var(--login-muted);
  max-width: 480px;
  margin-bottom: 1.75rem;
}

.hero-features {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

.hero-features li {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
}

.feat-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.feat-icon--purple {
  background: rgba(139, 92, 246, 0.12);
  color: #7c3aed;
  border: 1px solid rgba(139, 92, 246, 0.25);
}

.feat-icon--blue {
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
  border: 1px solid rgba(59, 130, 246, 0.22);
}

.feat-icon--green {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
  border: 1px solid rgba(16, 185, 129, 0.22);
}

.hero-features strong {
  display: block;
  font-size: 0.9rem;
  margin-bottom: 0.15rem;
}

.hero-features span {
  font-size: 0.78rem;
  color: var(--login-muted);
}

.hero-visual {
  position: relative;
  height: 200px;
  max-width: 420px;
  margin-bottom: 1.5rem;
}

.portal-ring {
  position: absolute;
  left: 50%;
  top: 55%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 1px solid rgba(139, 92, 246, 0.25);
}

.portal-ring-1 {
  width: 200px;
  height: 120px;
  border-radius: 50%;
  box-shadow: 0 0 40px rgba(139, 92, 246, 0.2);
}

.portal-ring-2 {
  width: 240px;
  height: 140px;
  opacity: 0.6;
}

.portal-ring-3 {
  width: 280px;
  height: 160px;
  opacity: 0.35;
}

.portal-core {
  position: absolute;
  left: 50%;
  top: 55%;
  transform: translate(-50%, -50%);
  width: 160px;
  height: 100px;
  border-radius: 50%;
  overflow: hidden;
  box-shadow:
    0 0 60px rgba(251, 191, 36, 0.35),
    0 0 80px rgba(139, 92, 246, 0.4);
  border: 2px solid rgba(167, 139, 250, 0.5);
}

.portal-sky {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #1e3a5f 0%, #f59e0b 45%, #fb923c 70%, #7c3aed 100%);
}

.portal-figure {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 36px;
  background: #0f172a;
  border-radius: 12px 12px 4px 4px;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.3);
}

.float-tag {
  position: absolute;
  font-size: 0.68rem;
  padding: 0.25rem 0.55rem;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(139, 92, 246, 0.25);
  color: #6d28d9;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);
  animation: tag-float 4s ease-in-out infinite;
}

.tag-1 {
  top: 12%;
  left: 8%;
  animation-delay: 0s;
}
.tag-2 {
  top: 5%;
  right: 15%;
  animation-delay: 0.5s;
}
.tag-3 {
  top: 38%;
  right: 0;
  animation-delay: 1s;
}
.tag-5 {
  bottom: 10%;
  right: 8%;
  animation-delay: 2s;
}

@keyframes tag-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

.hero-quote {
  max-width: 420px;
  margin-bottom: 1rem;
}

.hero-quote p {
  font-size: 0.88rem;
  color: var(--login-muted);
  line-height: 1.6;
  font-style: italic;
}

.hero-quote cite {
  display: block;
  margin-top: 0.35rem;
  font-size: 0.75rem;
  color: var(--login-muted);
  opacity: 0.8;
  font-style: normal;
}

.hero-dots {
  display: flex;
  gap: 0.4rem;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(148, 163, 184, 0.45);
  transition: all 0.3s;
}

.dot.active {
  width: 20px;
  border-radius: 3px;
  background: linear-gradient(90deg, var(--login-purple), var(--login-blue));
}

.login-panel-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: 2.25rem 2rem 1.75rem;
  border-radius: 16px;
  border: 1px solid var(--login-border);
  background: var(--login-card);
  backdrop-filter: blur(12px);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.8) inset,
    0 16px 48px rgba(99, 102, 241, 0.1),
    0 4px 24px rgba(15, 23, 42, 0.06);
}

.card-title {
  font-size: 1.65rem;
  font-weight: 700;
  margin-bottom: 0.35rem;
}

.card-subtitle {
  font-size: 0.85rem;
  color: var(--login-muted);
  margin-bottom: 1.75rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.field {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0 1rem;
  height: 48px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: #f8fafc;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.field:focus-within {
  border-color: rgba(124, 58, 237, 0.45);
  background: #fff;
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
}

.field-icon {
  font-size: 0.95rem;
  opacity: 0.55;
  flex-shrink: 0;
}

.field input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  color: var(--login-text);
  font-size: 0.9rem;
}

.field input::placeholder {
  color: #94a3b8;
}

.field input:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.field-toggle {
  border: none;
  background: none;
  cursor: pointer;
  font-size: 0.95rem;
  opacity: 0.6;
  padding: 0.2rem;
}

.field-toggle:hover {
  opacity: 1;
}

.form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.15rem;
}

.remember {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: var(--login-muted);
  cursor: pointer;
}

.remember input {
  accent-color: var(--login-purple);
}

.link-btn,
.link-accent {
  border: none;
  background: none;
  cursor: pointer;
  font-size: inherit;
  font-family: inherit;
}

.link-btn {
  font-size: 0.8rem;
  color: var(--login-muted);
}

.error-msg {
  font-size: 0.82rem;
  color: #dc2626;
  text-align: center;
}

.btn-login {
  width: 100%;
  height: 48px;
  margin-top: 0.35rem;
  border: none;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #6366f1 100%);
  box-shadow: 0 4px 24px rgba(124, 58, 237, 0.45);
  transition: filter 0.2s, transform 0.2s;
}

.btn-login:hover:not(:disabled) {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.btn-login:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.demo-hint {
  text-align: center;
  margin-top: 1rem;
  font-size: 0.72rem;
  color: #94a3b8;
}

@media (max-width: 960px) {
  .login-layout {
    grid-template-columns: 1fr;
    padding: 1rem 1.25rem 2rem;
  }

  .login-hero {
    display: none;
  }
}
</style>
