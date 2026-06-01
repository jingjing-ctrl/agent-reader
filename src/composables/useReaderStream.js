import { computed, nextTick, ref } from 'vue'

const MAX_STREAM_PAGES = 5
const STREAM_PRELOAD_PX = 200
const SCROLL_EDGE = 4
const WHEEL_EDGE_COOLDOWN_MS = 320

/**
 * 虚拟列表式连续阅读：多页拼接、滚动边界预加载、scrollTop 补偿，翻页无跳变。
 */
export function useReaderStream(booksStore, getScrollEl) {
  const streamRangeStart = ref(0)
  const streamRangeEnd = ref(0)
  const isScrollAnchoring = ref(false)
  const wheelEdgeLock = ref(false)
  let scrollRaf = 0
  let wheelLockTimer = 0

  const streamPages = computed(() => {
    const pages = booksStore.pages
    if (!pages.length) return []
    const list = []
    for (let i = streamRangeStart.value; i <= streamRangeEnd.value; i++) {
      list.push({ pageIndex: i, paragraphs: pages[i] })
    }
    return list
  })

  function isScrollable(el) {
    return el.scrollHeight > el.clientHeight + SCROLL_EDGE
  }

  function atScrollTop(el) {
    return el.scrollTop <= SCROLL_EDGE
  }

  function atScrollBottom(el) {
    return el.scrollTop + el.clientHeight >= el.scrollHeight - SCROLL_EDGE
  }

  function lockWheelEdge() {
    wheelEdgeLock.value = true
    clearTimeout(wheelLockTimer)
    wheelLockTimer = window.setTimeout(() => {
      wheelEdgeLock.value = false
    }, WHEEL_EDGE_COOLDOWN_MS)
  }

  function getChunkHeight(el, pageIndex) {
    const node = el.querySelector(`.reader-page-chunk[data-page-index="${pageIndex}"]`)
    return node?.offsetHeight ?? 0
  }

  function getChunkTop(el, pageIndex) {
    const node = el.querySelector(`.reader-page-chunk[data-page-index="${pageIndex}"]`)
    return node?.offsetTop ?? 0
  }

  function setStreamRangeAround(pageIndex) {
    const pages = booksStore.pages
    if (!pages.length) return
    const last = pages.length - 1
    const idx = Math.max(0, Math.min(pageIndex, last))
    const pad = Math.floor(MAX_STREAM_PAGES / 2)
    streamRangeStart.value = Math.max(0, idx - pad)
    streamRangeEnd.value = Math.min(last, idx + pad)
  }

  function ensurePageInStream(pageIndex) {
    if (pageIndex >= streamRangeStart.value && pageIndex <= streamRangeEnd.value) {
      return
    }
    setStreamRangeAround(pageIndex)
  }

  function resetStream() {
    streamRangeStart.value = 0
    streamRangeEnd.value = 0
  }

  function scrollToPageStart(pageIndex, attempt = 0) {
    const el = getScrollEl()
    if (!el) return

    const chunk = el.querySelector(`.reader-page-chunk[data-page-index="${pageIndex}"]`)
    if (!chunk) {
      if (attempt < 4) {
        nextTick(() => scrollToPageStart(pageIndex, attempt + 1))
      }
      return
    }

    const firstPara = chunk.querySelector('.paragraph')
    const elTop = el.getBoundingClientRect().top
    const targetEl = firstPara || chunk
    const y = targetEl.getBoundingClientRect().top - elTop + el.scrollTop

    isScrollAnchoring.value = true
    el.scrollTop = Math.max(0, y - 12)
    requestAnimationFrame(() => {
      isScrollAnchoring.value = false
    })
  }

  function scrollToParagraph(pageIndex, paragraphId, attempt = 0) {
    const el = getScrollEl()
    if (!el) return

    setStreamRangeAround(pageIndex)
    booksStore.goToPage(pageIndex)

    nextTick(() => {
      nextTick(() => {
        const target = paragraphId
          ? el.querySelector(`[data-paragraph-id="${paragraphId}"]`)
          : null

        if (!target) {
          if (attempt < 4) {
            scrollToParagraph(pageIndex, paragraphId, attempt + 1)
          } else {
            scrollToPageStart(pageIndex)
          }
          return
        }

        const elTop = el.getBoundingClientRect().top
        const y = target.getBoundingClientRect().top - elTop + el.scrollTop

        isScrollAnchoring.value = true
        el.scrollTop = Math.max(0, y - 12)
        requestAnimationFrame(() => {
          isScrollAnchoring.value = false
        })
      })
    })
  }

  function restoreReadingPosition(pageIndex, paragraphId = null) {
    if (!booksStore.pages.length) return
    scrollToParagraph(pageIndex, paragraphId)
  }

  function captureReadingPosition(el) {
    if (!el) return null

    updateActivePageFromScroll(el)

    const mid = el.scrollTop + el.clientHeight * 0.38
    const elTop = el.getBoundingClientRect().top
    const paragraphs = el.querySelectorAll('.paragraph[data-paragraph-id]')

    for (const node of paragraphs) {
      const rect = node.getBoundingClientRect()
      const top = rect.top - elTop + el.scrollTop
      const bottom = top + rect.height
      if (mid >= top && mid < bottom) {
        const chunk = node.closest('.reader-page-chunk')
        return {
          pageIndex: Number(chunk?.dataset.pageIndex ?? booksStore.currentPageIndex),
          paragraphId: node.dataset.paragraphId || null,
        }
      }
    }

    return {
      pageIndex: booksStore.currentPageIndex,
      paragraphId: null,
    }
  }

  /** 翻到指定页并定位到该页第一个段落 */
  function goToPageAtStart(pageIndex) {
    const last = booksStore.pages.length - 1
    const idx = Math.max(0, Math.min(pageIndex, last))
    booksStore.goToPage(idx)
    setStreamRangeAround(idx)
    isScrollAnchoring.value = true
    nextTick(() => {
      nextTick(() => scrollToPageStart(idx))
    })
  }

  function syncToPage(pageIndex, { scroll = false } = {}) {
    if (scroll) goToPageAtStart(pageIndex)
    else setStreamRangeAround(pageIndex)
  }

  function updateActivePageFromScroll(el) {
    const chunks = el.querySelectorAll('.reader-page-chunk')
    if (!chunks.length) return

    const mid = el.scrollTop + el.clientHeight * 0.38
    let active = Number(chunks[0].dataset.pageIndex)

    for (const node of chunks) {
      const top = node.offsetTop
      const bottom = top + node.offsetHeight
      if (mid >= top && mid < bottom) {
        active = Number(node.dataset.pageIndex)
        break
      }
    }

    const last = chunks[chunks.length - 1]
    if (mid >= last.offsetTop + last.offsetHeight) {
      active = Number(last.dataset.pageIndex)
    }

    if (active !== booksStore.currentPageIndex) {
      booksStore.goToPage(active)
      ensurePageInStream(active)
    }
  }

  function maybeExpandStreamUp(el) {
    if (streamRangeStart.value <= 0) return false

    const firstTop = getChunkTop(el, streamRangeStart.value)
    const nearTop = atScrollTop(el) || el.scrollTop <= firstTop + STREAM_PRELOAD_PX
    if (!nearTop) return false

    const scrollTopBefore = el.scrollTop
    const trimEnd =
      streamRangeEnd.value - streamRangeStart.value + 1 >= MAX_STREAM_PAGES
        ? streamRangeEnd.value
        : null
    const removedH = trimEnd !== null ? getChunkHeight(el, trimEnd) : 0

    streamRangeStart.value -= 1
    if (trimEnd !== null) streamRangeEnd.value -= 1

    isScrollAnchoring.value = true
    nextTick(() => {
      const added = getChunkHeight(el, streamRangeStart.value)
      el.scrollTop = Math.max(0, scrollTopBefore + added - removedH)
      requestAnimationFrame(() => {
        isScrollAnchoring.value = false
      })
    })
    return true
  }

  function maybeExpandStreamDown(el) {
    const lastPage = booksStore.pages.length - 1
    if (streamRangeEnd.value >= lastPage) return false

    const lastIdx = streamRangeEnd.value
    const lastBottom = getChunkTop(el, lastIdx) + getChunkHeight(el, lastIdx)
    const nearEnd =
      atScrollBottom(el) || el.scrollTop + el.clientHeight >= lastBottom - STREAM_PRELOAD_PX
    if (!nearEnd) return false

    const scrollTopBefore = el.scrollTop
    const trimStart =
      streamRangeEnd.value - streamRangeStart.value + 1 >= MAX_STREAM_PAGES
        ? streamRangeStart.value
        : null
    const removedH = trimStart !== null ? getChunkHeight(el, trimStart) : 0

    streamRangeEnd.value += 1
    if (trimStart !== null) streamRangeStart.value += 1

    isScrollAnchoring.value = true
    nextTick(() => {
      el.scrollTop = Math.max(0, scrollTopBefore - removedH)
      requestAnimationFrame(() => {
        isScrollAnchoring.value = false
      })
    })
    return true
  }

  function tryAdvanceAtScrollEdge(el) {
    const lastPage = booksStore.pages.length - 1
    const next = booksStore.currentPageIndex + 1
    if (next > lastPage) return false

    if (el.querySelector(`[data-page-index="${next}"]`)) {
      goToPageAtStart(next)
      return true
    }

    if (streamRangeEnd.value < lastPage && maybeExpandStreamDown(el)) {
      nextTick(() => goToPageAtStart(next))
      return true
    }

    goToPageAtStart(next)
    return true
  }

  function tryRetreatAtScrollEdge(el) {
    const prev = booksStore.currentPageIndex - 1
    if (prev < 0) return false

    if (el.querySelector(`[data-page-index="${prev}"]`)) {
      goToPageAtStart(prev)
      return true
    }

    if (streamRangeStart.value > 0 && maybeExpandStreamUp(el)) {
      nextTick(() => goToPageAtStart(prev))
      return true
    }

    goToPageAtStart(prev)
    return true
  }

  function handleReaderScrollFrame() {
    const el = getScrollEl()
    if (!el || isScrollAnchoring.value || !booksStore.pages.length) return
    updateActivePageFromScroll(el)
    maybeExpandStreamUp(el)
    maybeExpandStreamDown(el)
  }

  function onReaderScroll() {
    if (isScrollAnchoring.value) return
    cancelAnimationFrame(scrollRaf)
    scrollRaf = requestAnimationFrame(handleReaderScrollFrame)
  }

  function onReaderWheel(e) {
    if (isScrollAnchoring.value || wheelEdgeLock.value || !booksStore.pages.length) {
      return
    }
    const el = getScrollEl()
    if (!el || e.deltaY === 0) return

    const down = e.deltaY > 0
    const scrollable = isScrollable(el)

    if (down) {
      if (scrollable && !atScrollBottom(el)) return
      e.preventDefault()
      if (tryAdvanceAtScrollEdge(el)) lockWheelEdge()
    } else {
      if (scrollable && !atScrollTop(el)) return
      e.preventDefault()
      if (tryRetreatAtScrollEdge(el)) lockWheelEdge()
    }
  }

  function tryArrowScroll(el, direction) {
    if (!el) return false
    const down = direction === 'down'
    if (down) {
      if (isScrollable(el) && !atScrollBottom(el)) return false
      return tryAdvanceAtScrollEdge(el)
    }
    if (isScrollable(el) && !atScrollTop(el)) return false
    return tryRetreatAtScrollEdge(el)
  }

  return {
    streamPages,
    syncToPage,
    goToPageAtStart,
    restoreReadingPosition,
    captureReadingPosition,
    resetStream,
    onReaderScroll,
    onReaderWheel,
    tryArrowScroll,
    isScrollable,
    atScrollTop,
    atScrollBottom,
    isScrollAnchoring,
  }
}
