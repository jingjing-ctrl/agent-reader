import ePub from 'epubjs'
import {
  enrichEpubToc,
  buildFallbackTocFromHeadings,
  PARAGRAPHS_PER_PAGE,
} from './toc'

const PARSE_TIMEOUT_MS = 120000
const BLOCK_SELECTOR = 'p, h1, h2, h3, h4, blockquote, li, figure, img'

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms)
    }),
  ])
}

export async function parseEpubFromFile(file) {
  return withTimeout(
    parseEpubInternal(file),
    PARSE_TIMEOUT_MS,
    'EPUB 解析超时，请尝试较小的文件或稍后重试'
  )
}

export async function parseEpubFromArrayBuffer(arrayBuffer, fileName = 'book.epub') {
  const file = new File([arrayBuffer], fileName, {
    type: 'application/epub+zip',
  })
  return parseEpubFromFile(file)
}

async function parseEpubInternal(file) {
  const arrayBuffer = file instanceof ArrayBuffer ? file : await file.arrayBuffer()
  const book = ePub(arrayBuffer)
  await book.ready

  const title =
    book.packaging?.metadata?.title ||
    book.package?.metadata?.title ||
    file.name.replace(/\.epub$/i, '')

  const paragraphs = []
  const sectionOffsets = []
  const length = book.spine?.length ?? 0

  for (let i = 0; i < length; i++) {
    const section = book.spine.get(i)
    if (!section) continue
    try {
      sectionOffsets.push({
        spineIndex: i,
        href: section.href || section.url || '',
        paragraphIndex: paragraphs.length,
      })
      await section.load(book.load.bind(book))
      const blocks = await extractSectionBlocks(book, section, i)
      paragraphs.push(...blocks)
    } catch {
      /* skip broken sections */
    }
  }

  if (!paragraphs.length) {
    const fallback = await extractFallbackText(book)
    paragraphs.push(...fallback)
  }

  let toc = []
  try {
    await book.loaded.navigation
    const navItems = book.navigation?.toc || []
    toc = enrichEpubToc(navItems, sectionOffsets, paragraphs)
  } catch {
    /* ignore */
  }

  if (!toc.length) {
    toc = buildFallbackTocFromHeadings(paragraphs)
  }

  const coverUrl = await extractCoverDataUrl(book)

  try {
    book.destroy?.()
  } catch {
    /* ignore */
  }

  return { title, paragraphs, coverUrl, toc }
}

function collectTopLevelBlocks(root) {
  const candidates = [...root.querySelectorAll(BLOCK_SELECTOR)].filter(
    (el) => !el.closest('nav')
  )

  return candidates.filter((el) => {
    let parent = el.parentElement
    while (parent && parent !== root) {
      if (parent.matches(BLOCK_SELECTOR)) return false
      parent = parent.parentElement
    }
    return true
  })
}

function normalizeBlockType(tagName) {
  const tag = String(tagName || 'p').toLowerCase()
  if (['h1', 'h2', 'h3', 'h4', 'p', 'blockquote', 'li'].includes(tag)) return tag
  return 'p'
}

function resolveRelativeHref(baseHref, target) {
  if (!target) return ''
  if (/^(data:|blob:|https?:)/i.test(target)) return target
  if (target.startsWith('/')) return target.replace(/^\//, '')

  const baseParts = String(baseHref || '').split('/')
  baseParts.pop()
  const parts = target.split('/')

  for (const part of parts) {
    if (part === '..') baseParts.pop()
    else if (part && part !== '.') baseParts.push(part)
  }
  return baseParts.join('/')
}

function toArchivePath(resolved) {
  if (!resolved) return null
  let path = resolved
  if (path.includes('://')) {
    try {
      path = new URL(path).pathname
    } catch {
      /* keep original */
    }
  }
  return path.startsWith('/') ? path : `/${path}`
}

function resolveImagePath(book, section, src) {
  if (!src) return null
  const trimmed = src.trim().split('#')[0].split('?')[0]
  if (/^(data:|blob:|https?:)/i.test(trimmed)) return trimmed

  const sectionHref = section.href || section.url || ''
  const relativePath = resolveRelativeHref(sectionHref, trimmed)
  return book.resolve(relativePath) || relativePath
}

function pickImageSrc(img) {
  const direct =
    img.getAttribute('src') ||
    img.getAttribute('data-src') ||
    img.getAttribute('xlink:href')
  if (direct) {
    try {
      return decodeURIComponent(direct)
    } catch {
      return direct
    }
  }

  const srcset = img.getAttribute('srcset')
  if (!srcset) return null
  const first = srcset.split(',')[0]?.trim().split(/\s+/)[0]
  if (!first) return null
  try {
    return decodeURIComponent(first)
  } catch {
    return first
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

async function loadImageDataUrl(book, section, src) {
  const resolved = resolveImagePath(book, section, src)
  if (!resolved) return null

  try {
    if (resolved.startsWith('data:')) return resolved

    if (resolved.startsWith('blob:')) {
      const res = await fetch(resolved)
      if (!res.ok) return null
      return await blobToDataUrl(await res.blob())
    }

    if (book.archived && book.archive) {
      const archivePath = toArchivePath(book.resolve(resolved) || resolved)
      const base64 = await book.archive.getBase64(archivePath)
      if (base64) return base64

      const blob = await book.archive.getBlob(archivePath)
      if (blob?.size) return await blobToDataUrl(blob)
    }

    const loaded = await book.load(resolved)
    if (loaded instanceof Blob && loaded.size) {
      return await blobToDataUrl(loaded)
    }
    if (typeof loaded === 'string') {
      if (loaded.startsWith('data:')) return loaded
      if (/^https?:\/\//i.test(loaded) || loaded.startsWith('blob:')) {
        const res = await fetch(loaded)
        if (!res.ok) return null
        return await blobToDataUrl(await res.blob())
      }
    }
  } catch {
    return null
  }

  return null
}

async function extractImageBlock(book, section, img, sectionIndex, index) {
  const src = pickImageSrc(img)
  const dataUrl = await loadImageDataUrl(book, section, src)
  if (!dataUrl) return null

  return {
    id: `img-${sectionIndex}-${index}`,
    type: 'image',
    src: dataUrl,
    alt: img.getAttribute('alt')?.trim() || '',
  }
}

async function extractBlocksFromElement(book, section, el, sectionIndex, startIndex) {
  const blocks = []
  const tag = el.tagName.toLowerCase()

  if (tag === 'img' || tag === 'figure') {
    const img = tag === 'figure' ? el.querySelector('img') : el
    if (img) {
      const block = await extractImageBlock(
        book,
        section,
        img,
        sectionIndex,
        startIndex + blocks.length
      )
      if (block) blocks.push(block)
    }
    return blocks
  }

  const imgs = [...el.querySelectorAll('img')]
  const text = el.textContent?.replace(/\s+/g, ' ').trim()
  const textWithoutAlt = imgs.reduce((value, img) => {
    const alt = img.getAttribute('alt')?.trim()
    return alt ? value.replace(alt, '').trim() : value
  }, text)

  if (imgs.length && (!textWithoutAlt || textWithoutAlt.length <= 1)) {
    for (const img of imgs) {
      const block = await extractImageBlock(
        book,
        section,
        img,
        sectionIndex,
        startIndex + blocks.length
      )
      if (block) blocks.push(block)
    }
    return blocks
  }

  if (text && text.length > 1) {
    blocks.push({
      id: `p-${sectionIndex}-${startIndex + blocks.length}`,
      type: normalizeBlockType(tag),
      text,
      anchorId: el.id?.trim() || null,
    })
  }

  return blocks
}

async function extractSectionBlocks(book, section, sectionIndex) {
  const doc = section.document
  if (!doc?.body) return []

  const elements = collectTopLevelBlocks(doc.body)
  const blocks = []

  for (const el of elements) {
    const extracted = await extractBlocksFromElement(
      book,
      section,
      el,
      sectionIndex,
      blocks.length
    )
    blocks.push(...extracted)
  }

  return blocks
}

async function extractCoverDataUrl(book) {
  try {
    if (book.archived && book.archive && book.cover) {
      const archivePath = toArchivePath(book.resolve(book.cover) || book.cover)
      const base64 = await book.archive.getBase64(archivePath)
      if (base64) return base64
    }

    const url = await book.coverUrl()
    if (!url) return null
    const res = await fetch(url)
    const blob = await res.blob()
    if (!blob.size) return null
    return await blobToDataUrl(blob)
  } catch {
    return null
  }
}

async function extractFallbackText(book) {
  const paragraphs = []
  try {
    const text = await book.getRange?.()
    if (text) {
      text
        .split(/\n{2,}/)
        .map((s) => s.trim())
        .filter((s) => s.length > 2)
        .forEach((t, idx) =>
          paragraphs.push({ id: `fb-${idx}`, text: t, type: 'p' })
        )
    }
  } catch {
    /* ignore */
  }
  return paragraphs
}

export function paginateParagraphs(paragraphs, perPage = PARAGRAPHS_PER_PAGE) {
  const pages = []
  for (let i = 0; i < paragraphs.length; i += perPage) {
    pages.push(paragraphs.slice(i, i + perPage))
  }
  return pages.length ? pages : [[]]
}

export function isTextBlock(block) {
  return block?.type !== 'image'
}
