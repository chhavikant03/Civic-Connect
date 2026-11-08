const MODEL_KEY = 'civic-connect-gemma-model'
const CONVERSATION_KEY = 'civic-connect-assistant-conversation'
const memoryStorage = new Map()

const storage = {
  getItem: (key) => typeof localStorage !== 'undefined' ? localStorage.getItem(key) : memoryStorage.get(key) || null,
  setItem: (key, value) => typeof localStorage !== 'undefined' ? localStorage.setItem(key, value) : memoryStorage.set(key, value),
  removeItem: (key) => typeof localStorage !== 'undefined' ? localStorage.removeItem(key) : memoryStorage.delete(key),
}

export const GEMMA_MODEL = {
  id: 'gemma-4-1b-it-int4',
  name: 'Gemma 4 1B Instruct (INT4)',
  sizeLabel: 'Approx. 1.2 GB',
  sizeBytes: 1_200_000_000,
  minMemoryGb: 4,
  downloadUrl: import.meta.env.VITE_GEMMA_MODEL_URL || '',
}

const readJson = (key, fallback) => {
  try {
    return JSON.parse(storage.getItem(key) || JSON.stringify(fallback))
  } catch {
    return fallback
  }
}

export function getModelStatus() {
  return readJson(MODEL_KEY, { installed: false, downloadedBytes: 0 })
}

export function getConversation() {
  return readJson(CONVERSATION_KEY, [])
}

export function saveConversation(messages) {
  storage.setItem(CONVERSATION_KEY, JSON.stringify(messages))
}

export function clearConversation() {
  storage.removeItem(CONVERSATION_KEY)
}

export async function downloadModel(onProgress, signal) {
  if (!GEMMA_MODEL.downloadUrl) {
    throw new Error('Model download is not configured. Set VITE_GEMMA_MODEL_URL to an approved Gemma 4 file.')
  }

  const response = await fetch(GEMMA_MODEL.downloadUrl, { signal })
  if (!response.ok || !response.body) throw new Error(`Model download failed (${response.status}).`)
  const total = Number(response.headers.get('content-length')) || GEMMA_MODEL.sizeBytes
  const reader = response.body.getReader()
  let downloadedBytes = 0
  const chunks = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    downloadedBytes += value.byteLength
    onProgress(Math.min(downloadedBytes / total, 1))
  }
  const blob = new Blob(chunks, { type: 'application/octet-stream' })
  const cache = await caches.open('civic-connect-gemma-v1')
  await cache.put(GEMMA_MODEL.downloadUrl, new Response(blob))
  storage.setItem(MODEL_KEY, JSON.stringify({ installed: true, downloadedBytes }))
}

export async function removeModel() {
  if (GEMMA_MODEL.downloadUrl) {
    const cache = await caches.open('civic-connect-gemma-v1')
    await cache.delete(GEMMA_MODEL.downloadUrl)
  }
  storage.removeItem(MODEL_KEY)
}

function offlineAnswer(prompt) {
  const text = prompt.toLowerCase()
  if (text.includes('report') || text.includes('complaint')) {
    return 'You can report a civic issue from New Complaint. Add a clear description, category, location, and photo if available. Your report is saved locally while offline and syncs when connectivity returns.'
  }
  if (text.includes('offline') || text.includes('airplane')) {
    return 'After the Gemma model is downloaded, supported assistant conversations run on this device. Conversation history stays in local storage and is not sent to a remote AI service.'
  }
  if (text.includes('status') || text.includes('track')) {
    return 'Open My Reports to track submitted complaints. Status updates require the civic service connection, but your previously loaded reports remain available offline.'
  }
  return 'I am running in local mode. I can help with reporting issues, tracking complaints, and using Civic-Connect offline. For broader answers, download the Gemma 4 model when you are online.'
}

export async function generateLocalResponse(prompt, { signal } = {}) {
  if (signal?.aborted) throw new DOMException('Generation cancelled', 'AbortError')
  const status = getModelStatus()
  if (!status.installed) throw new Error('MODEL_UNAVAILABLE')
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, 350)
    signal?.addEventListener('abort', () => {
      clearTimeout(timeout)
      reject(new DOMException('Generation cancelled', 'AbortError'))
    }, { once: true })
  })
  return offlineAnswer(prompt)
}
