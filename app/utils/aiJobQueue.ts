/**
 * Dauerhafte AI-Job-Warteschlange im Browser (IndexedDB) —
 * Parität zur Android WorkManager-Queue: Jobs überleben Reload,
 * solange der Tab/SW das Gerät nicht hart killt.
 */

export type AiJobStatus = 'queued' | 'running' | 'done' | 'failed'

export interface AiJobRecord {
  id: string
  route: string
  createdAt: number
  status: AiJobStatus
  error?: string
}

const DB_NAME = 'shliste-ai-jobs'
const STORE = 'jobs'
const VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('ai-jobs db'))
  })
}

export async function enqueueAiJob(route: string): Promise<AiJobRecord> {
  const job: AiJobRecord = {
    id: crypto.randomUUID(),
    route,
    createdAt: Date.now(),
    status: 'queued',
  }
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(job)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('put job'))
  })
  db.close()
  return job
}

export async function updateAiJob(
  id: string,
  patch: Partial<Pick<AiJobRecord, 'status' | 'error'>>,
): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const getReq = store.get(id)
    getReq.onsuccess = () => {
      const current = getReq.result as AiJobRecord | undefined
      if (!current) {
        resolve()
        return
      }
      store.put({ ...current, ...patch })
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('update job'))
  })
  db.close()
}

export async function listAiJobs(): Promise<AiJobRecord[]> {
  const db = await openDb()
  const rows = await new Promise<AiJobRecord[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve((req.result as AiJobRecord[]) ?? [])
    req.onerror = () => reject(req.error ?? new Error('list jobs'))
  })
  db.close()
  return rows.sort((a, b) => b.createdAt - a.createdAt)
}
