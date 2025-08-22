import browser from 'webextension-polyfill'

async function ensureOffscreen() {
  const has = await (browser.offscreen as any).hasDocument?.()
  if (!has) {
    await (browser.offscreen as any).createDocument({
      url: 'offscreen.html',
      reasons: ['USER_MEDIA'],
      justification: 'Processar gravação de mídia e replay sem UI'
    })
  }
}

async function uploadBlob(endpoint: string, blob: Blob, meta: Record<string, any> = {}) {
  const form = new FormData()
  form.append('file', blob, `capture-${Date.now()}.webm`)
  const tabs = await browser.tabs.query({ active: true, currentWindow: true })
  form.append('meta', JSON.stringify({
    url: tabs[0]?.url || '',
    ts: Date.now(),
    ...meta
  }))
  const res = await fetch(endpoint, { method: 'POST', body: form })
  if (!res.ok) throw new Error('Upload failed ' + res.status)
  return res.json().catch(() => ({}))
}

// Mantém a última captura para o Editor
let lastBlob: Blob | null = null
let lastRecChunk: Blob | null = null

browser.runtime.onMessage.addListener(async (msg) => {
  // Encaminha comandos para o offscreen
  if (['REPLAY_START','REPLAY_SAVE','REC_START','REC_STOP'].includes(msg?.type)) {
    await ensureOffscreen()
    await browser.runtime.sendMessage(msg)
    return
  }

  // Export do replay (últimos 120s)
  if (msg?.type === 'REPLAY_EXPORT') {
    const blob = new Blob([msg.buffer], { type: 'video/webm' })
    lastBlob = blob
    try {
      await uploadBlob(msg.endpoint, blob, { kind: 'replay' })
    } catch (e) {
      console.error(e)
    }
    return
  }

  // Recebe chunks de gravação contínua
  if (msg?.type === 'REC_CHUNK') {
    lastRecChunk = msg.blob
    return
  }

  // Fim da gravação contínua
  if (msg?.type === 'REC_DONE') {
    if (lastRecChunk) {
      lastBlob = lastRecChunk
      try {
        await uploadBlob(msg.endpoint, lastRecChunk, { kind: 'recording' })
      } catch (e) {
        console.error(e)
      }
    }
    return
  }

  // Editor pedindo a última captura
  if (msg?.type === 'EDITOR_GET_LAST') {
    if (!lastBlob) return { ok: false }
    const ab = await lastBlob.arrayBuffer()
    return { ok: true, arrayBuffer: ab }
  }
})
