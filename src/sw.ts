// src/sw.ts (background service worker in MV3)
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

async function uploadBlobDirect(bytes, filename, kind, endpoint) {
  const blob = new Blob([new Uint8Array(bytes)], { type: 'video/webm' })
  if (!blob.size) throw new Error('Blob vazio')
  const fd = new FormData()
  fd.append(kind === 'replay' ? 'replay' : 'record', blob, filename || 'clip.webm')
  fd.append('meta', JSON.stringify({ kind, ts: Date.now() }))
  const res = await fetch(endpoint, { method: 'POST', body: fd })
  if (!res.ok) throw new Error(`Upload falhou: ${res.status}`)
  return res.json()
}

// MV3 runtime messaging from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg?.type === 'UPLOAD_BLOB_DATA') {
        const { bytes, filename, kind, endpoint } = msg.payload || {}
        await uploadBlobDirect(bytes, filename, kind, endpoint)
        sendResponse({ ok: true })
      } else if (msg?.type === 'UPLOAD_BLOB') {
        // noop here; data arrives via UPLOAD_BLOB_DATA in this simple scheme
        sendResponse({ ok: true })
      }
    } catch (e) {
      sendResponse({ ok: false, error: String(e) })
    }
  })()
  return true // keep channel open for async sendResponse
})
