self.addEventListener('install', () => (self as any).skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil((self as any).clients.claim()))

chrome.runtime.onMessage.addListener(async (msg, _sender, sendResponse) => {
  if (msg?.type !== 'UPLOAD_BLOB') return
  const { bytes, filename, kind = 'record', endpoint } = msg.payload || {}
  try {
    const blob = new Blob([new Uint8Array(bytes)], { type: 'video/webm' })
    if (!blob.size) throw new Error('Blob vazio')
    const fd = new FormData()
    fd.append(kind === 'replay' ? 'replay' : 'record', blob, filename || 'clip.webm')
    fd.append('meta', JSON.stringify({ kind, ts: Date.now() }))
    const res = await fetch(endpoint, { method: 'POST', body: fd })
    if (!res.ok) throw new Error(`Upload falhou: ${res.status}`)
    const json = await res.json()
    chrome.runtime.sendMessage({ type: 'UPLOAD_OK', data: json })
    sendResponse?.({ ok: true })
  } catch (err: any) {
    chrome.runtime.sendMessage({ type: 'UPLOAD_FAIL', error: String(err?.message || err) })
    sendResponse?.({ ok: false, error: String(err?.message || err) })
  }
  return true
})
