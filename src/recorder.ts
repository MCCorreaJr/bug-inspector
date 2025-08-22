const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T
const epInput = $('#endpoint') as HTMLInputElement
const btnStart = $('#btnStart') as HTMLButtonElement
const btnStop = $('#btnStop') as HTMLButtonElement
const btnSaveReplay = $('#btnSaveReplay') as HTMLButtonElement
const statusEl = $('#status') as HTMLSpanElement
const timerEl = $('#timer') as HTMLSpanElement

type Chunk = { blob: Blob; ts: number }

let mediaStream: MediaStream | null = null
let recorder: MediaRecorder | null = null
let chunks: Blob[] = []
let replayBuf: Chunk[] = []
const replayMs = 120_000
let startAt = 0
let tickInt: number | null = null

// Prioriza VP8 (mais compatível com players do Windows)
const MIME_CANDIDATES = [
  'video/webm;codecs=vp8,opus',
  'video/webm;codecs=vp9,opus',
  'video/webm'
]
function pickMime(): string {
  for (const m of MIME_CANDIDATES) if (MediaRecorder.isTypeSupported(m)) return m
  return 'video/webm'
}

// endpoint persistido do popup
epInput.value = localStorage.getItem('bi:endpoint') || 'http://localhost:8787/api/upload'
epInput.addEventListener('change', () => localStorage.setItem('bi:endpoint', epInput.value.trim()))

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}
function setStatus(s: string) { statusEl.textContent = s }

function startTimer() {
  if (tickInt) window.clearInterval(tickInt)
  tickInt = window.setInterval(() => { timerEl.textContent = fmt(Date.now() - startAt) }, 250)
}
function stopTimer() { if (tickInt) window.clearInterval(tickInt); tickInt = null }

function concatBlobs(arr: Blob[], type = 'video/webm') {
  return arr.length ? new Blob(arr, { type }) : new Blob([], { type })
}
function buildReplayBlob(): Blob {
  const cutoff = Date.now() - replayMs
  const recent = replayBuf.filter(c => c.ts >= cutoff).map(c => c.blob)
  return concatBlobs(recent, 'video/webm')
}

async function uploadViaSW(blob: Blob, filename: string, kind: 'record'|'replay') {
  if (!blob || !blob.size) throw new Error('Blob vazio')
  const endpoint = epInput.value.trim()
  localStorage.setItem('bi:endpoint', endpoint)

  const buf = await blob.arrayBuffer()
  const bytes = Array.from(new Uint8Array(buf))
  await chrome.runtime.sendMessage({ type: 'UPLOAD_BLOB', payload: { bytes, filename, kind, endpoint } })
  setStatus(`enviando ${filename}...`)
}
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'UPLOAD_OK') { setStatus('upload OK'); console.log('UPLOAD_OK', msg.data) }
  if (msg?.type === 'UPLOAD_FAIL') { setStatus('upload FAIL'); console.error('UPLOAD_FAIL', msg.error); alert(msg.error) }
})

async function startRecording() {
  if (recorder) return
  try {
    mediaStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
  } catch {
    alert('Selecione uma fonte no diálogo (guia/janela/tela) para habilitar "Compartilhar".')
    return
  }

  chunks = []; replayBuf = []
  const mime = pickMime()
  // bitrate ajuda na compatibilidade de players (e dá tamanho razoável)
  recorder = new MediaRecorder(mediaStream!, {
    mimeType: mime,
    videoBitsPerSecond: 3_000_000 // ~3 Mbps
  })

  recorder.ondataavailable = (ev) => {
    if (ev.data && ev.data.size) {
      chunks.push(ev.data)
      replayBuf.push({ blob: ev.data, ts: Date.now() })
      const cutoff = Date.now() - replayMs
      while (replayBuf.length && replayBuf[0].ts < cutoff) replayBuf.shift()
    }
  }

  recorder.onstop = async () => {
    stopTimer()
    try {
      const out = concatBlobs(chunks, 'video/webm')
      if (!out.size) { setStatus('vazio'); return }
      await uploadViaSW(out, `record-${Date.now()}.webm`, 'record')
    } catch (e) { alert(String(e)) }
    finally { cleanup() }
  }

  recorder.start(1000)
  startAt = Date.now(); startTimer()
  btnStart.disabled = true
  btnStop.disabled = false
  btnSaveReplay.disabled = false
  setStatus('gravando')
}

function stopRecording() {
  if (!recorder) return
  recorder.stop()
  mediaStream?.getTracks().forEach(t => t.stop())
}

async function saveReplay() {
  try {
    const blob = buildReplayBlob()
    if (!blob.size) { alert('Replay vazio'); return }
    await uploadViaSW(blob, `replay-${Date.now()}.webm`, 'replay')
  } catch (e) { alert(String(e)) }
}

function cleanup() {
  recorder = null
  mediaStream = null
  btnStart.disabled = false
  btnStop.disabled = true
  setStatus('idle')
}

btnStart.onclick = startRecording
btnStop.onclick = stopRecording
btnSaveReplay.onclick = saveReplay
btnStop.disabled = true
btnSaveReplay.disabled = true
setStatus('idle')
timerEl.textContent = '00:00'
