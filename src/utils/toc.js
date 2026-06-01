export const PARAGRAPHS_PER_PAGE = 6

const SKIP_LABEL_RE =
  /^(封面|扉页|版权|目录|书名页|Cover|Title Page|Copyright|Table of Contents|Contents|Navigation|Nav)$/i
const SKIP_HREF_RE = /(?:^|\/)nav(?:\.xhtml|\.html)?$|(?:^|\/)toc(?:\.xhtml|\.html)?$|(?:^|\/)cover(?:\.xhtml|\.html)?$/i

export function paragraphIndexToPageIndex(paragraphIndex, perPage = PARAGRAPHS_PER_PAGE) {
  return Math.floor(Math.max(0, paragraphIndex) / perPage)
}

export function normalizeHref(href) {
  if (!href) return ''
  const path = String(href).split('#')[0].split('?')[0]
  try {
    return decodeURIComponent(path).replace(/^\//, '').toLowerCase()
  } catch {
    return path.replace(/^\//, '').toLowerCase()
  }
}

export function basename(path) {
  const normalized = normalizeHref(path)
  const idx = normalized.lastIndexOf('/')
  return idx >= 0 ? normalized.slice(idx + 1) : normalized
}

function findParagraphIndexForHref(sectionOffsets, href) {
  if (!sectionOffsets.length) return 0

  const target = normalizeHref(href)
  const targetBase = basename(href)
  if (!target && !targetBase) return 0

  let best = sectionOffsets[0].paragraphIndex
  let bestScore = -1

  for (const section of sectionOffsets) {
    const sectionHref = normalizeHref(section.href)
    const sectionBase = basename(section.href)
    let score = -1

    if (target && sectionHref === target) score = 100
    else if (target && (target.endsWith(sectionHref) || sectionHref.endsWith(target))) score = 80
    else if (targetBase && sectionBase === targetBase) score = 70
    else if (targetBase && sectionBase.includes(targetBase)) score = 50

    if (score > bestScore) {
      bestScore = score
      best = section.paragraphIndex
    }
  }

  return best
}

function findParagraphIndexForPdfPage(pageParagraphStarts, pdfPage) {
  if (!pageParagraphStarts.length) return 0
  let idx = pageParagraphStarts[0].paragraphIndex
  for (const start of pageParagraphStarts) {
    if (start.pdfPage <= pdfPage) idx = start.paragraphIndex
    else break
  }
  return idx
}

export function shouldSkipTocItem(item) {
  const label = item.label?.trim() || item.title?.trim() || ''
  const href = item.href || ''
  if (label && SKIP_LABEL_RE.test(label)) return true
  if (href && SKIP_HREF_RE.test(normalizeHref(href))) return true
  return false
}

export function extractHrefFragment(href) {
  if (!href || !href.includes('#')) return ''
  const fragment = href.split('#').slice(1).join('#').split('?')[0]
  try {
    return decodeURIComponent(fragment).trim()
  } catch {
    return fragment.trim()
  }
}

function normalizeTocText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim()
}

function isHeadingType(type) {
  return type === 'h1' || type === 'h2' || type === 'h3' || type === 'h4'
}

function titleMatchesBlock(title, block) {
  const normalizedTitle = normalizeTocText(title)
  const text = normalizeTocText(block.text)
  if (!normalizedTitle || !text) return false

  if (text === normalizedTitle) return true

  if (isHeadingType(block.type)) {
    if (text.includes(normalizedTitle) || normalizedTitle.includes(text)) {
      return text.length >= Math.min(normalizedTitle.length, 4)
    }
  }

  return false
}

function findParagraphIndexByAnchor(paragraphs, baseIndex, anchorId, maxIndex) {
  if (!anchorId) return null
  const target = anchorId.toLowerCase()
  const end = Math.min(maxIndex ?? paragraphs.length, paragraphs.length)

  for (let i = Math.max(0, baseIndex); i < end; i++) {
    const anchor = paragraphs[i].anchorId
    if (anchor && anchor.toLowerCase() === target) return i
  }

  return null
}

function resolveNavParagraphIndex(item, sectionOffsets, paragraphs, minIndex = 0) {
  const title = (item.label || item.title || '').trim()
  const href = item.href || ''
  const baseIndex = Math.max(findParagraphIndexForHref(sectionOffsets, href), minIndex)
  const anchorId = extractHrefFragment(href)

  let maxIndex = paragraphs.length
  for (const section of sectionOffsets) {
    if (section.paragraphIndex > baseIndex) {
      maxIndex = section.paragraphIndex
      break
    }
  }

  const anchorMatch = findParagraphIndexByAnchor(
    paragraphs,
    baseIndex,
    anchorId,
    maxIndex
  )
  if (anchorMatch != null) return anchorMatch

  if (title && paragraphs.length) {
    const normalizedTitle = normalizeTocText(title)

    for (let i = baseIndex; i < maxIndex; i++) {
      const block = paragraphs[i]
      if (titleMatchesBlock(normalizedTitle, block)) return i
    }

    for (let i = baseIndex; i < maxIndex; i++) {
      const block = paragraphs[i]
      const text = normalizeTocText(block.text)
      if (!text) continue
      if (text === normalizedTitle || text.includes(normalizedTitle)) return i
    }
  }

  return baseIndex
}

function pushNavItems(items, sectionOffsets, paragraphs, depth, idPrefix, out, searchState) {
  for (let i = 0; i < (items || []).length; i++) {
    const item = items[i]
    if (shouldSkipTocItem(item)) continue

    const title = (item.label || item.title || '').trim()
    if (!title) continue

    const paragraphIndex = resolveNavParagraphIndex(
      item,
      sectionOffsets,
      paragraphs,
      searchState.index
    )
    searchState.index = paragraphIndex + 1

    out.push({
      id: item.id || `${idPrefix}-${depth}-${i}`,
      title,
      pageIndex: paragraphIndexToPageIndex(paragraphIndex),
      paragraphIndex,
      depth,
    })

    if (item.subitems?.length || item.items?.length) {
      pushNavItems(
        item.subitems || item.items,
        sectionOffsets,
        paragraphs,
        depth + 1,
        idPrefix,
        out,
        searchState
      )
    }
  }
}

export function enrichEpubToc(navItems, sectionOffsets, paragraphs = []) {
  const out = []
  const searchState = { index: 0 }
  pushNavItems(navItems, sectionOffsets, paragraphs, 0, 'epub-toc', out, searchState)
  return dedupeToc(out)
}

export async function enrichPdfToc(outline, pdf, pageParagraphStarts) {
  async function resolvePdfPage(dest) {
    if (!dest) return null
    try {
      let destArray = dest
      if (typeof dest === 'string') {
        destArray = await pdf.getDestination(dest)
      }
      if (!destArray?.[0]) return null
      const pageIndex = await pdf.getPageIndex(destArray[0])
      return pageIndex + 1
    } catch {
      return null
    }
  }

  const out = []

  async function walk(items, depth = 0) {
    for (let i = 0; i < (items || []).length; i++) {
      const item = items[i]
      if (shouldSkipTocItem(item)) continue

      const title = (item.title || '').trim()
      if (!title) continue

      const pdfPage = await resolvePdfPage(item.dest)
      if (!pdfPage) continue

      const paragraphIndex = findParagraphIndexForPdfPage(pageParagraphStarts, pdfPage)
      out.push({
        id: `pdf-toc-${depth}-${i}`,
        title,
        pageIndex: paragraphIndexToPageIndex(paragraphIndex),
        paragraphIndex,
        depth,
        pdfPage,
      })

      if (item.items?.length) {
        await walk(item.items, depth + 1)
      }
    }
  }

  if (outline?.length) {
    await walk(outline)
  }

  return dedupeToc(out)
}

export function buildFallbackTocFromHeadings(paragraphs) {
  const out = []

  paragraphs.forEach((block, index) => {
    if (block.type !== 'h1' && block.type !== 'h2') return
    const text = block.text?.trim()
    if (!text) return

    out.push({
      id: block.id,
      title: text,
      pageIndex: paragraphIndexToPageIndex(index),
      paragraphIndex: index,
      depth: block.type === 'h1' ? 0 : 1,
    })
  })

  return dedupeToc(out)
}

function dedupeToc(items) {
  const seen = new Set()
  return items.filter((item) => {
    const key = `${item.paragraphIndex ?? item.pageIndex}:${item.title}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function findParagraphIndexInPages(pages, paragraphId) {
  if (!paragraphId || !pages?.length) return null
  let index = 0
  for (const page of pages) {
    for (const block of page) {
      if (block.id === paragraphId) return index
      index++
    }
  }
  return null
}

export function findParagraphIdAtIndex(pages, paragraphIndex) {
  if (paragraphIndex == null || !pages?.length) return null
  let index = 0
  for (const page of pages) {
    for (const block of page) {
      if (index === paragraphIndex) return block.id
      index++
    }
  }
  return null
}

export function syncActiveTocId(tocItems, pages, pageIndex, paragraphId) {
  if (!tocItems?.length) return null

  const paragraphIndex = findParagraphIndexInPages(pages, paragraphId)
  let activeId = tocItems[0]?.id ?? null

  for (const item of tocItems) {
    const start =
      item.paragraphIndex ??
      paragraphIndexToPageIndex(item.pageIndex) * PARAGRAPHS_PER_PAGE

    if (paragraphIndex != null && item.paragraphIndex != null) {
      if (start <= paragraphIndex) activeId = item.id
      continue
    }

    if (item.pageIndex <= pageIndex) activeId = item.id
  }

  return activeId
}

export function isTocItemActive(
  item,
  index,
  flatItems,
  currentPageIndex,
  activeTocId,
  currentParagraphIndex
) {
  if (activeTocId) return item.id === activeTocId

  const start =
    item.paragraphIndex ??
    paragraphIndexToPageIndex(item.pageIndex) * PARAGRAPHS_PER_PAGE
  const next = flatItems[index + 1]
  const end = next
    ? (next.paragraphIndex ??
      paragraphIndexToPageIndex(next.pageIndex) * PARAGRAPHS_PER_PAGE)
    : Number.POSITIVE_INFINITY

  if (currentParagraphIndex != null && item.paragraphIndex != null) {
    return currentParagraphIndex >= start && currentParagraphIndex < end
  }

  if (currentPageIndex < item.pageIndex) return false
  if (!next) return true
  if (item.pageIndex < next.pageIndex) {
    return currentPageIndex >= item.pageIndex && currentPageIndex < next.pageIndex
  }

  return index === flatItems.length - 1 || item.id === flatItems[flatItems.length - 1]?.id
}
