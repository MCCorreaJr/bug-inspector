const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T

const epInput       = $('#endpoint') as HTMLInputElement
const btnStart      = $('#btnStart') as HTMLButtonElement
const btnStop       = $('#btnStop') as HTMLButtonElement
const btnReplaySave = $('#btnReplaySave') as HTMLButtonElement
const btnGrant      = $('#btnGrant') as HTMLButtonElement
const permCta       = $('#permCta') as HTMLDivElement

const statusEl      = $('#status') as HTMLSpanElement
const timerEl       = $('#timer') as HTMLSpanElement
const replayStateEl = $('#replayState') as HTMLSpanElement

epInput.value = localStorage.getItem('bi:endpoint') || 'http://localhost:8787/api/upload'
epInput.addEventListener('change', () => localStorage.setItem('bi:endpoint', epInput.value.trim()))

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}
function setStatus(s: string) { statusEl.textContent = s }

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
  if (msg?.type === 'UPLOAD_OK')   { setStatus('upload OK') }
  if (msg?.type === 'UPLOAD_FAIL') { setStatus('upload FAIL'); alert(msg.error) }
})

const MIME_CANDIDATES = ['video/webm;codecs=vp8,opus','video/webm;codecs=vp9,opus','video/webm']
function pickMime(): string { for (const m of MIME_CANDIDATES) if (MediaRecorder.isTypeSupported(m)) return m; return 'video/webm' }
const DEFAULT_VIDEO_BPS = 3_000_000

// ===== Gravação normal =====
let recStream: MediaStream | null = null
let recorder: MediaRecorder | null = null
let recChunks: Blob[] = []
let recStartAt = 0
let recTick: number | null = null

function concatBlobs(arr: Blob[], type = 'video/webm') { return arr.length ? new Blob(arr, { type }) : new Blob([], { type }) }
function startRecTimer() { if (recTick) clearInterval(recTick); recTick = window.setInterval(() => { timerEl.textContent = fmt(Date.now() - recStartAt) }, 250) }
function stopRecTimer()  { if (recTick) clearInterval(recTick); recTick = null }

async function startRecording() {
  if (recorder) return
  try { recStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true }) }
  catch { alert('Selecione uma fonte (guia/janela/tela).'); return }

  recChunks = []
  const mime = pickMime()
  recorder = new MediaRecorder(recStream!, { mimeType: mime, videoBitsPerSecond: DEFAULT_VIDEO_BPS })

  recorder.ondataavailable = ev => { if (ev.data && ev.data.size) recChunks.push(ev.data) }
  recorder.onstop = async () => {
    stopRecTimer()
    try {
      const out = concatBlobs(recChunks, 'video/webm')
      if (!out.size) { setStatus('vazio'); return }
      await uploadViaSW(out, `record-${Date.now()}.webm`, 'record')
    } finally {
      recorder = null; recStream?.getTracks().forEach(t => t.stop()); recStream = null
      btnStart.disabled = false; btnStop.disabled = true; setStatus('idle')
    }
  }

  recorder.start(1000)
  recStartAt = Date.now(); startRecTimer()
  btnStart.disabled = true; btnStop.disabled = false
  setStatus('gravando')
}
function stopRecording() { if (recorder) recorder.stop() }

// ===== Replay contínuo (3 min) — “armado” no startup =====
type RepChunk = { blob: Blob; ts: number }
let repStream: MediaStream | null = null
let repRecorder: MediaRecorder | null = null
let repBuffer: RepChunk[] = []
const REPLAY_MS = 180_000

let replayRequested = false   // evita pedir repetidamente
let replayReady = false       // habilita botão quando já temos chunks

async function grantAndStartReplay() {
  if (repRecorder) return
  try { repStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true }) }
  catch { setStatus('permita a captura para habilitar replay'); return }

  repBuffer = []
  repRecorder = new MediaRecorder(repStream!, { mimeType: pickMime(), videoBitsPerSecond: 2_500_000 })
  repRecorder.ondataavailable = ev => {
    if (ev.data && ev.data.size) {
      repBuffer.push({ blob: ev.data, ts: Date.now() })
      const cutoff = Date.now() - REPLAY_MS
      while (repBuffer.length && repBuffer[0].ts < cutoff) repBuffer.shift()
      if (!replayReady && repBuffer.length) {
        replayReady = true
        btnReplaySave.disabled = false
        permCta.style.display = 'none'
        replayStateEl.textContent = 'ativo'
        setStatus('replay pronto')
      }
    }
  }
  repRecorder.onstop = () => {
    repRecorder = null; repStream?.getTracks().forEach(t => t.stop()); repStream = null
    replayReady = false
    btnReplaySave.disabled = true
    permCta.style.display = ''
    replayStateEl.textContent = 'desligado'
    setStatus('aguardando permissão…')
  }

  repRecorder.start(1000)
  setStatus('inicializando replay…')
}

async function saveReplay() {
  if (!repRecorder) { /* sem permissão ainda */ alert('Para salvar Replay, permita a captura (clique no botão acima ou pressione Enter).'); return }
  if (!repBuffer.length) { alert('Replay ainda vazio — aguarde alguns segundos.'); return }
  const cutoff = Date.now() - REPLAY_MS
  const blobs = repBuffer.filter(c => c.ts >= cutoff).map(c => c.blob)
  const out = concatBlobs(blobs, 'video/webm')
  if (!out.size) { alert('Replay vazio.'); return }
  await uploadViaSW(out, `replay-${Date.now()}.webm`, 'replay')
}

// Gesto automático: qualquer clique/Enter/Space/Scroll inicia o pedido UMA vez
function requestFromGesture() {
  if (replayRequested) return
  replayRequested = true
  grantAndStartReplay()
}
window.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.code === 'Space') requestFromGesture()
}, { once: true })
window.addEventListener('click', requestFromGesture, { once: true })
window.addEventListener('wheel', requestFromGesture, { once: true })
btnGrant.addEventListener('click', () => { replayRequested = true; grantAndStartReplay() })

btnStart.onclick = startRecording
btnStop.onclick = stopRecording
btnReplaySave.onclick = saveReplay

btnStop.disabled = true
btnReplaySave.disabled = true
timerEl.textContent = '00:00'
replayStateEl.textContent = 'desligado'
setStatus('aguardando permissão…')
