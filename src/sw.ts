import { uploadBlob } from './uploader.ts'

self.addEventListener('install', () => (self as any).skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil((self as any).clients.claim()))

// ========= Upload genérico =========
chrome.runtime.onMessage.addListener(async (msg, _sender, sendResponse) => {
  if (msg?.type === 'UPLOAD_BLOB') {
    const { bytes, filename, kind = 'record', endpoint } = msg.payload || {}
    try {
      const json = await uploadBlob(endpoint, bytes, filename, kind)
      chrome.runtime.sendMessage({ type: 'UPLOAD_OK', data: json })
      sendResponse?.({ ok: true })
    } catch (err: any) {
      chrome.runtime.sendMessage({ type: 'UPLOAD_FAIL', error: String(err?.message || err) })
      sendResponse?.({ ok: false, error: String(err?.message || err) })
    }
    return true
  }
})

// ========= Offscreen helpers =========
async function hasOffscreen(): Promise<boolean> {
  try { /* @ts-ignore */ return !!(await chrome.offscreen.hasDocument?.()) } catch { return false }
}
async function ensureOffscreen() {
  if (await hasOffscreen()) return
  /* @ts-ignore */
  await chrome.offscreen.createDocument({
    url: chrome.runtime.getURL('offscreen.html'),
    reasons: ['USER_MEDIA'],
    justification: 'Instant Replay com streamId (getUserMedia)'
  })
}

// ========= Orquestração Replay =========
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg?.type === 'REPLAY_ENSURE_RUNNING') {
      try {
        await ensureOffscreen()
        const r = await chrome.runtime.sendMessage({ type: 'OFFSCREEN_REPLAY_ENSURE' })
        sendResponse?.(r)
      } catch (e: any) {
        sendResponse?.({ ok: false, error: String(e?.message || e) })
      }
      return
    }

    // Recebe streamId do probe (content) e inicia o recorder no offscreen
    if (msg?.type === 'PROBE_STREAM_ID') {
      try {
        if (!msg.streamId) throw new Error(msg.error || 'Não foi possível obter streamId')
        await ensureOffscreen()
        const r = await chrome.runtime.sendMessage({
          type: 'OFFSCREEN_REPLAY_START_WITH',
          streamId: msg.streamId
        })
        sendResponse?.(r) // { ok: true } quando começar
      } catch (e: any) {
        sendResponse?.({ ok: false, error: String(e?.message || e) })
      }
      return
    }

    if (msg?.type === 'REPLAY_SAVE_CURRENT_TAB') {
      try {
        await ensureOffscreen()
        const r: any = await chrome.runtime.sendMessage({ type: 'OFFSCREEN_REPLAY_SAVE' })
        if (!r?.ok) throw new Error(r?.error || 'Falha ao obter bytes do replay')

        const endpoint = await new Promise<string>((resolve) =>
          chrome.storage.local.get({ endpoint: 'http://localhost:8787/api/upload' }, o => resolve(o.endpoint))
        )
        const resp = await uploadBlob(endpoint, r.bytes, `replay-${Date.now()}.webm`, 'replay')
        sendResponse?.({ ok: true, data: resp })
      } catch (e: any) {
        sendResponse?.({ ok: false, error: String(e?.message || e) })
      }
      return
    }

    if (msg?.type === 'REPLAY_STATUS') {
      try {
        await ensureOffscreen()
        const r = await chrome.runtime.sendMessage({ type: 'OFFSCREEN_REPLAY_STATUS' })
        sendResponse?.(r)
      } catch (e:any) {
        sendResponse?.({ ok:false, error:String(e?.message || e) })
      }
      return
    }
  })()
  return true
})
