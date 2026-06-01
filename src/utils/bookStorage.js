const DB_NAME = 'agent-reader-db'
const STORE_CONTENT = 'book-content'
const STORE_FILES = 'book-files'
const DB_VERSION = 3

async function resolveOpenVersion() {
  if (typeof indexedDB.databases !== 'function') return DB_VERSION
  try {
    const dbs = await indexedDB.databases()
    const existing = dbs.find((db) => db.name === DB_NAME)
    if (existing?.version && existing.version > DB_VERSION) {
      return existing.version
    }
  } catch {
    /* ignore */
  }
  return DB_VERSION
}

function openDB() {
  return resolveOpenVersion().then(
    (version) =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, version)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve(request.result)
        request.onupgradeneeded = (event) => {
          const db = event.target.result
          if (!db.objectStoreNames.contains(STORE_CONTENT)) {
            db.createObjectStore(STORE_CONTENT)
          }
          if (!db.objectStoreNames.contains(STORE_FILES)) {
            db.createObjectStore(STORE_FILES)
          }
        }
      })
  )
}

function runTx(storeName, mode, run) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode)
        const store = tx.objectStore(storeName)
        let output = null
        try {
          const req = run(store)
          if (req instanceof IDBRequest) {
            req.onsuccess = () => {
              output = req.result ?? null
            }
            req.onerror = () => reject(req.error)
          }
        } catch (err) {
          db.close()
          reject(err)
          return
        }
        tx.oncomplete = () => {
          db.close()
          resolve(output)
        }
        tx.onerror = () => {
          db.close()
          reject(tx.error)
        }
        tx.onabort = () => {
          db.close()
          reject(tx.error)
        }
      })
  )
}

export function saveBookContent(id, data) {
  return runTx(STORE_CONTENT, 'readwrite', (store) => store.put(data, id))
}

export function loadBookContent(id) {
  return runTx(STORE_CONTENT, 'readonly', (store) => store.get(id))
}

/** 保存电子书原文件（ArrayBuffer），刷新后据此重新解析 */
export function saveBookFile(id, record) {
  return runTx(STORE_FILES, 'readwrite', (store) => store.put(record, id))
}

export function loadBookFile(id) {
  return runTx(STORE_FILES, 'readonly', (store) => store.get(id))
}

export function deleteBookData(id) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_CONTENT, STORE_FILES], 'readwrite')
        tx.objectStore(STORE_CONTENT).delete(id)
        tx.objectStore(STORE_FILES).delete(id)
        tx.oncomplete = () => {
          db.close()
          resolve()
        }
        tx.onerror = () => {
          db.close()
          reject(tx.error)
        }
      })
  )
}

/** @deprecated use deleteBookData */
export function deleteBookContent(id) {
  return deleteBookData(id)
}
