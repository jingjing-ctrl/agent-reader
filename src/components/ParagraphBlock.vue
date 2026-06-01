<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  paragraph: { type: Object, required: true },
  selected: Boolean,
  readingViewMode: {
    type: String,
    default: 'original',
    validator: (v) => ['bilingual', 'original'].includes(v),
  },
  translation: { type: String, default: '' },
  translationError: { type: String, default: '' },
  translating: Boolean,
})

const emit = defineEmits(['select', 'request-translation'])

const isImage = computed(() => props.paragraph.type === 'image')
const blockType = computed(() => props.paragraph.type || 'p')

const textTag = computed(() => {
  const type = blockType.value
  return ['h1', 'h2', 'h3', 'h4'].includes(type) ? type : 'p'
})

const imageWrapRef = ref(null)
const blockRef = ref(null)
const imageSrc = ref('')
const imageLoaded = ref(false)
const imageFailed = ref(false)
let imageObserver = null
let translationObserver = null
const translationRequested = ref(false)

function resetImageState() {
  imageSrc.value = ''
  imageLoaded.value = false
  imageFailed.value = false
}

function disconnectImageObserver() {
  imageObserver?.disconnect()
  imageObserver = null
}

function loadImageNow() {
  if (!props.paragraph.src || imageSrc.value) return
  imageSrc.value = props.paragraph.src
  disconnectImageObserver()
}

function setupImageObserver() {
  disconnectImageObserver()
  if (!isImage.value || !props.paragraph.src) return

  if (typeof IntersectionObserver === 'undefined') {
    loadImageNow()
    return
  }

  imageObserver = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        loadImageNow()
      }
    },
    {
      root: null,
      rootMargin: '240px 0px',
      threshold: 0.01,
    }
  )

  if (imageWrapRef.value) {
    imageObserver.observe(imageWrapRef.value)
  }
}

onMounted(() => {
  if (isImage.value) nextTick(setupImageObserver)
  nextTick(setupTranslationObserver)
})

watch(
  () => props.paragraph.src,
  () => {
    if (!isImage.value) return
    resetImageState()
    nextTick(setupImageObserver)
  }
)

onBeforeUnmount(() => {
  disconnectImageObserver()
  disconnectTranslationObserver()
})

function disconnectTranslationObserver() {
  translationObserver?.disconnect()
  translationObserver = null
}

function shouldObserveTranslation() {
  return (
    props.readingViewMode === 'bilingual' &&
    !isImage.value &&
    !translationRequested.value &&
    !props.translation &&
    !props.translationError &&
    !props.translating
  )
}

function requestTranslationLazy() {
  if (!shouldObserveTranslation()) return
  translationRequested.value = true
  emit('request-translation', props.paragraph)
  disconnectTranslationObserver()
}

function setupTranslationObserver() {
  disconnectTranslationObserver()
  if (!shouldObserveTranslation()) return

  if (typeof IntersectionObserver === 'undefined') {
    requestTranslationLazy()
    return
  }

  translationObserver = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        requestTranslationLazy()
      }
    },
    {
      root: null,
      rootMargin: '240px 0px',
      threshold: 0.01,
    }
  )

  if (blockRef.value) {
    translationObserver.observe(blockRef.value)
  }
}

watch(
  () => [
    props.readingViewMode,
    props.translation,
    props.translationError,
    props.translating,
  ],
  () => {
    if (props.translation || props.translationError) {
      translationRequested.value = true
    }
    nextTick(setupTranslationObserver)
  }
)
</script>

<template>
  <article
    ref="blockRef"
    class="paragraph"
    :data-paragraph-id="paragraph.id"
    :class="[
      isImage ? 'paragraph--image' : `paragraph--${blockType}`,
      {
        selected,
        'paragraph--bilingual': readingViewMode === 'bilingual' && !isImage,
      },
    ]"
    @click="emit('select')"
  >
    <figure v-if="isImage" ref="imageWrapRef" class="image-block">
      <div
        v-if="!imageLoaded && !imageFailed"
        class="image-placeholder"
        aria-hidden="true"
      >
        <span class="image-placeholder-spinner" />
      </div>
      <img
        v-if="imageSrc"
        :src="imageSrc"
        :alt="paragraph.alt || '插图'"
        class="reader-image"
        :class="{ 'reader-image--loaded': imageLoaded }"
        loading="lazy"
        decoding="async"
        fetchpriority="low"
        @load="imageLoaded = true"
        @error="imageFailed = true"
      />
      <p v-if="imageFailed" class="image-error">插图加载失败</p>
      <figcaption v-if="paragraph.alt && imageLoaded" class="image-caption reader-font">
        {{ paragraph.alt }}
      </figcaption>
    </figure>

    <template v-else-if="readingViewMode === 'original'">
      <component
        :is="textTag"
        class="text reader-font"
        :class="`text-${blockType}`"
      >
        {{ paragraph.text }}
      </component>
    </template>

    <template v-else>
      <component
        :is="textTag"
        class="text reader-font"
        :class="`text-${blockType}`"
      >
        {{ paragraph.text }}
      </component>

      <div
        class="translation-block translation-block--bilingual"
        @click.stop
      >
        <span class="bilingual-label">EN</span>
        <p v-if="translating" class="translation-loading">正在翻译…</p>
        <p v-else-if="translationError" class="translation-error">{{ translationError }}</p>
        <p v-else-if="translation" class="translation-text reader-font">{{ translation }}</p>
        <p v-else class="translation-loading">等待翻译…</p>
      </div>
    </template>
  </article>
</template>

<style scoped>
.paragraph {
  padding: 1.25rem 0;
  border-bottom: 1px solid var(--border);
  transition: background 0.2s;
  cursor: pointer;
}

.paragraph:last-child {
  border-bottom: none;
}

.paragraph--h1 {
  padding: 1.75rem 0 1.1rem;
}

.paragraph--h2 {
  padding: 1.5rem 0 0.85rem;
}

.paragraph--h3 {
  padding: 1.25rem 0 0.65rem;
}

.paragraph--h4 {
  padding: 1rem 0 0.35rem;
}

.paragraph--blockquote {
  padding: 1rem 0;
}

.paragraph--li {
  padding: 0.65rem 0;
}

.paragraph--image {
  padding: 1rem 0;
  cursor: default;
}

.paragraph.selected {
  background: var(--accent-soft);
  margin: 0 -1rem;
  padding-left: 1rem;
  padding-right: 1rem;
  border-radius: var(--radius-sm);
  border-bottom-color: transparent;
}

.paragraph--image.selected {
  cursor: pointer;
}

.paragraph--bilingual {
  padding-bottom: 1rem;
}

.text {
  font-size: calc(1.05rem * var(--reader-font-scale, 1));
  line-height: 1.9;
  color: var(--text);
  margin: 0;
}

.text-h1 {
  text-align: center;
  font-weight: 700;
  font-size: calc(1.38rem * var(--reader-font-scale, 1));
  line-height: 1.55;
  letter-spacing: 0.02em;
}

.text-h2 {
  text-align: center;
  font-weight: 700;
  font-size: calc(1.18rem * var(--reader-font-scale, 1));
  line-height: 1.6;
}

.text-h3 {
  text-align: center;
  font-weight: 700;
  font-size: calc(1.08rem * var(--reader-font-scale, 1));
  line-height: 1.65;
}

.text-h4 {
  text-align: left;
  font-weight: 700;
  font-size: calc(1.05rem * var(--reader-font-scale, 1));
  line-height: 1.85;
}

.text-p {
  text-align: left;
  font-weight: 400;
}

.text-blockquote {
  text-align: left;
  font-weight: 400;
  padding-left: 1rem;
  border-left: 3px solid var(--border-strong);
  color: var(--text-muted);
}

.text-li {
  text-align: left;
  font-weight: 400;
  padding-left: 1.35rem;
  position: relative;
}

.text-li::before {
  content: '•';
  position: absolute;
  left: 0.15rem;
  color: var(--text-dim);
}

.image-block {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  min-height: 120px;
}

.image-placeholder {
  width: 100%;
  min-height: 120px;
  max-width: 420px;
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
  border: 1px dashed var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-placeholder-spinner {
  width: 28px;
  height: 28px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: image-spin 0.8s linear infinite;
}

@keyframes image-spin {
  to {
    transform: rotate(360deg);
  }
}

.reader-image {
  max-width: 100%;
  width: auto;
  height: auto;
  border-radius: var(--radius-sm);
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.12);
  opacity: 0;
  transition: opacity 0.25s ease;
}

.reader-image--loaded {
  opacity: 1;
}

.image-error {
  font-size: 0.82rem;
  color: var(--text-dim);
  margin: 0;
}

.image-caption {
  font-size: calc(0.82rem * var(--reader-font-scale, 1));
  line-height: 1.5;
  color: var(--text-dim);
  text-align: center;
}

.translation-block {
  margin-top: 0.75rem;
  padding: 0.85rem 1rem;
  border-radius: var(--radius-sm);
  background: var(--translation-bg);
  border-left: 3px solid var(--accent);
}

.translation-block--bilingual {
  position: relative;
  padding-top: 1.15rem;
  min-height: 3.5rem;
}

.bilingual-label {
  position: absolute;
  top: 0.55rem;
  left: 0.85rem;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--accent-hover);
  opacity: 0.85;
}

.translation-text {
  font-size: calc(0.98rem * var(--reader-font-scale, 1));
  line-height: 1.75;
  color: var(--text);
}

.translation-loading {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.translation-error {
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--danger);
}
</style>
