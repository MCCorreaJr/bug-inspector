type RepChunk = { data: Blob; ts: number }
const REPLAY_MS = 180_000

const state = {
  recorder: null as MediaRecorder | null,
  stream: null as MediaStream | null,
  chunks: [] as RepChunk[],
  mime: pickMime(),
  active: false
}

function pickMime() {
  const arr = ['video/webm;codecs=vp8,opus','video/webm;codecs=vp9,opus','video/webm']
  for (const m of arr) { try { if (MediaRecorder.isTypeSupported(m)) return m } catch {} }
  return 'video/webm'
}
function concatBlobs(blobs: Blob[], type = 'video/webm') {
  return blobs.length ? new Blob(blobs, { type }) : new Blob([], { type })
}

// Inicia captura usando streamId da guia (sem picker)
async function startWithStreamId(streamId: string) {
  if (state.recorder) return
  // @ts-ignore chrome-only constraints
  const constraints: any = {
    audio: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: streamId } },
    video: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: streamId } }
  }
  const stream = await navigator.mediaDevices.getUserMedia(constraints)

  const rec = new MediaRecorder(stream, { mimeType: state.mime, videoBitsPerSecond: 2_500_000 })
  state.stream = stream
  state.recorder = rec
  state.chunks = []
  state.active = false

  rec.ondataavailable = (ev) => {
    if (ev.data && ev.data.size) {
      state.chunks.push({ data: ev.data, ts: Date.now() })
      const cutoff = Date.now() - REPLAY_MS
      while (state.chunks.length && state.chunks[0].ts < cutoff) state.chunks.shift()
      if (!state.active) state.active = true
    }
  }
  rec.onstop = () => {
    try { state.stream?.getTracks().forEach(t => t.stop()) } catch {}
    state.stream = null
    state.recorder = null
    state.chunks = []
    state.active = false
  }
  rec.start(1000)
}

async function saveReplay(): Promise<Uint8Array> {
  if (!state.recorder) throw new Error('Replay não está ativo')
  const cutoff = Date.now() - REPLAY_MS
  const blobs = state.chunks.filter(c => c.ts >= cutoff).map(c => c.data)
  const out = concatBlobs(blobs, 'video/webm')
  if (!out.size) throw new Error('Replay vazio — aguarde alguns segundos')
  return new Uint8Array(await out.arrayBuffer())
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg?.type === 'OFFSCREEN_REPLAY_ENSURE') {
      sendResponse({ ok: true }); return
    }
    if (msg?.type === 'OFFSCREEN_REPLAY_START_WITH') {
      try { await startWithStreamId(msg.streamId); sendResponse({ ok: true }) }
      catch (e:any) { sendResponse({ ok:false, error:String(e?.message || e) }) }
      return
    }
    if (msg?.type === 'OFFSCREEN_REPLAY_SAVE') {
      try { const bytes = await saveReplay(); sendResponse({ ok: true, bytes: Array.from(bytes) }) }
      catch (e:any) { sendResponse({ ok:false, error:String(e?.message || e) }) }
      return
    }
    if (msg?.type === 'OFFSCREEN_REPLAY_STATUS') {
      sendResponse({ ok:true, active: !!state.active, hasRecorder: !!state.recorder, chunks: state.chunks.length })
      return
    }
  })()
  return true
})
