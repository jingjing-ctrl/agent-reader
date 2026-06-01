import * as pdfjsLib from 'pdfjs-dist'
import {
  enrichPdfToc,
  buildFallbackTocFromHeadings,
} from './toc'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

const PARSE_TIMEOUT_MS = 180000
const LINE_Y_TOLERANCE = 6
const PARA_GAP_MULTIPLIER = 1.8

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms)
    }),
  ])
}

function normalizeText(text) {
  return text.replace(/\s+/g, ' ').trim()
}

function groupItemsIntoLines(items) {
  const sorted = [...items]
    .filter((item) => item.str?.trim())
    .sort((a, b) => {
      const yDiff = b.transform[5] - a.transform[5]
      if (Math.abs(yDiff) > 0.5) return yDiff
      return a.transform[4] - b.transform[4]
    })

  const lines = []
  let current = []
  let lastY = null
  let lastHeight = 12

  for (const item of sorted) {
    const y = item.transform[5]
    const height = Math.abs(item.transform[3]) || Math.abs(item.transform[0]) || 12
    if (
      lastY !== null &&
      Math.abs(y - lastY) > Math.max(LINE_Y_TOLERANCE, lastHeight * 0.6)
    ) {
      const line = normalizeText(current.join(' '))
      if (line) lines.push({ text: line, y: lastY, height: lastHeight })
      current = []
    }
    lastY = y
    lastHeight = height
    current.push(item.str)
  }

  if (current.length) {
    const line = normalizeText(current.join(' '))
    if (line) lines.push({ text: line, y: lastY ?? 0, height: lastHeight })
  }

  return lines
}

function linesToParagraphs(lines) {
  if (!lines.length) return []

  const paragraphs = []
  let buffer = [lines[0].text]
  let prev = lines[0]

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    const gap = prev.y - line.y
    const threshold = Math.max(14, prev.height * PARA_GAP_MULTIPLIER)
    if (gap > threshold) {
      const text = normalizeText(buffer.join(' '))
      if (text.length > 1) paragraphs.push(text)
      buffer = []
    }
    buffer.push(line.text)
    prev = line
  }

  const tail = normalizeText(buffer.join(' '))
  if (tail.length > 1) paragraphs.push(tail)

  return paragraphs
}

async function extractPageParagraphs(page, pageIndex) {
  const viewport = page.getViewport({ scale: 1 })
  const textContent = await page.getTextContent({
    normalizeWhitespace: true,
    disableCombineTextItems: false,
  })

  const lines = groupItemsIntoLines(textContent.items)
  const chunks = linesToParagraphs(lines)

  if (chunks.length) {
    return chunks.map((text, idx) => ({
      id: `pdf-p${pageIndex}-${idx}`,
      text,
      type: 'p',
    }))
  }

  const fallback = normalizeText(
    textContent.items.map((item) => item.str).join(' ')
  )
  if (fallback.length > 1) {
    return [{ id: `pdf-p${pageIndex}-0`, text: fallback, type: 'p' }]
  }

  return []
}

export async function parsePdfFromFile(file) {
  return withTimeout(
    parsePdfInternal(file),
    PARSE_TIMEOUT_MS,
    'PDF 解析超时，请尝试较小的文件或稍后重试'
  )
}

export async function parsePdfFromArrayBuffer(arrayBuffer, fileName = 'book.pdf') {
  const file = new File([arrayBuffer], fileName, { type: 'application/pdf' })
  return parsePdfFromFile(file)
}

async function parsePdfInternal(file) {
  const arrayBuffer = file instanceof ArrayBuffer ? file : await file.arrayBuffer()
  const fileName = file.name || 'book.pdf'
  const title = fileName.replace(/\.pdf$/i, '')

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
  const pdf = await loadingTask.promise

  const paragraphs = []
  const pageParagraphStarts = []
  const total = pdf.numPages

  for (let pageNum = 1; pageNum <= total; pageNum++) {
    pageParagraphStarts.push({
      pdfPage: pageNum,
      paragraphIndex: paragraphs.length,
    })
    const page = await pdf.getPage(pageNum)
    const pageParagraphs = await extractPageParagraphs(page, pageNum)
    paragraphs.push(...pageParagraphs)
    page.cleanup?.()
  }

  let toc = []
  try {
    const outline = await pdf.getOutline()
    toc = await enrichPdfToc(outline, pdf, pageParagraphStarts)
  } catch {
    /* ignore */
  }

  if (!toc.length) {
    toc = buildFallbackTocFromHeadings(paragraphs)
  }

  await pdf.destroy?.()

  if (!paragraphs.length) {
    throw new Error(
      '未能从 PDF 中提取文字，可能是扫描版或图片 PDF，请使用含可选文字层的文件'
    )
  }

  return { title, paragraphs, toc }
}
