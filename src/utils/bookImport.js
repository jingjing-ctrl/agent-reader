import {
  parseEpubFromFile,
  parseEpubFromArrayBuffer,
  paginateParagraphs,
} from './epub'
import { parsePdfFromFile, parsePdfFromArrayBuffer } from './pdf'

export { paginateParagraphs }

export const BOOK_FORMAT_EPUB = 'epub'
export const BOOK_FORMAT_PDF = 'pdf'

export function detectBookFormat(fileOrName) {
  const name =
    typeof fileOrName === 'string'
      ? fileOrName
      : fileOrName?.name?.toLowerCase() || ''
  const type = typeof fileOrName === 'string' ? '' : fileOrName?.type?.toLowerCase() || ''

  if (name.endsWith('.pdf') || type.includes('pdf')) return BOOK_FORMAT_PDF
  if (name.endsWith('.epub') || type.includes('epub')) return BOOK_FORMAT_EPUB
  return null
}

export function isSupportedBookFile(file) {
  return !!detectBookFormat(file)
}

export function formatLabel(format) {
  return format === BOOK_FORMAT_PDF ? 'PDF' : 'EPUB'
}

export async function parseBookFromFile(file) {
  const format = detectBookFormat(file)
  if (format === BOOK_FORMAT_PDF) return parsePdfFromFile(file)
  if (format === BOOK_FORMAT_EPUB) return parseEpubFromFile(file)
  throw new Error('仅支持 EPUB 与 PDF 格式')
}

export async function parseBookFromArrayBuffer(arrayBuffer, fileName, format) {
  const resolved = format || detectBookFormat(fileName)
  if (resolved === BOOK_FORMAT_PDF) {
    return parsePdfFromArrayBuffer(arrayBuffer, fileName)
  }
  if (resolved === BOOK_FORMAT_EPUB) {
    return parseEpubFromArrayBuffer(arrayBuffer, fileName)
  }
  throw new Error('不支持的电子书格式')
}
