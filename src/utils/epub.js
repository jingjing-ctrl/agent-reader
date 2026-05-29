import ePub from 'epubjs'

const PARAGRAPHS_PER_PAGE = 6
const PARSE_TIMEOUT_MS = 120000

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
  const length = book.spine?.length ?? 0

  for (let i = 0; i < length; i++) {
    const section = book.spine.get(i)
    if (!section) continue
    try {
      await section.load(book.load.bind(book))
      const doc = section.document
      if (!doc?.body) continue

      const selectors = 'p, h1, h2, h3, h4, blockquote, li'
      const elements = doc.body.querySelectorAll(selectors)
      elements.forEach((el) => {
        const text = el.textContent?.replace(/\s+/g, ' ').trim()
        if (text && text.length > 1) {
          paragraphs.push({
            id: `p-${i}-${paragraphs.length}`,
            text,
          })
        }
      })
    } catch {
      /* skip broken sections */
    }
  }

  if (!paragraphs.length) {
    const fallback = await extractFallbackText(book)
    paragraphs.push(...fallback)
  }

  try {
    book.destroy?.()
  } catch {
    /* ignore */
  }

  return { title, paragraphs }
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
        .forEach((t, idx) => paragraphs.push({ id: `fb-${idx}`, text: t }))
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
