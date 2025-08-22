// src/sw.ts
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

async function uploadBlob(blob, filename, kind, endpoint) {
  if (!blob || !blob.size) throw new Error('Blob vazio')
  const fd = new FormData()
  fd.append(kind === 'replay' ? 'replay' : 'record', blob, filename || 'clip.webm')
  fd.append('meta', JSON.stringify({ kind, ts: Date.now() }))
  const res = await fetch(endpoint, { method: 'POST', body: fd })
  if (!res.ok) throw new Error(`Upload falhou: ${res.status}`)
  return res.json()
}

self.addEventListener('message', (evt) => {
  const msg = evt.data || {}
  if (msg?.type === 'UPLOAD_BLOB') {
    const { blob, filename, kind = 'record', endpoint } = msg.payload || {}
    uploadBlob(blob, filename, kind, endpoint)
      .then((json) => self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(cs => cs.forEach(c => c.postMessage({ type: 'UPLOAD_OK', data: json }))))
      .catch((err) => self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(cs => cs.forEach(c => c.postMessage({ type: 'UPLOAD_FAIL', error: String(err) }))))
  }
})
