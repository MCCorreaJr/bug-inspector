// src/popup.ts
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
let replayMs = 120_000
let startAt = 0
let tickInt: number | null = null
const MIME = 'video/webm;codecs=vp9,opus'

function loadEndpoint() {
  const v = localStorage.getItem('bi:endpoint') || 'http://localhost:8787/api/upload'
  epInput.value = v
}
function saveEndpoint() {
  localStorage.setItem('bi:endpoint', epInput.value.trim())
}
epInput?.addEventListener('change', saveEndpoint)
loadEndpoint()

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}
function setStatus(s: string) { statusEl.textContent = s }

function startTimer() {
  if (tickInt) window.clearInterval(tickInt)
  tickInt = window.setInterval(() => {
    const now = Date.now()
    timerEl.textContent = fmt(now - startAt)
  }, 250)
}
function stopTimer() {
  if (tickInt) window.clearInterval(tickInt)
  tickInt = null
}

function concatBlobs(arr: Blob[], type = 'video/webm') {
  if (!arr.length) return new Blob([], { type })
  return new Blob(arr, { type })
}

function buildReplayBlob(): Blob {
  const cutoff = Date.now() - replayMs
  const recent = replayBuf.filter(c => c.ts >= cutoff).map(c => c.blob)
  return concatBlobs(recent, 'video/webm')
}

// Em MV3, a popup NÃO acessa o background via navigator.serviceWorker.
// Use chrome.runtime.sendMessage para falar com o SW (background).
async function sendUploadToBackground(blob: Blob, filename: string, kind: 'record'|'replay', endpoint: string) {
  return new Promise<void>((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'UPLOAD_BLOB', payload: { filename, kind, endpoint } }, async (resp) => {
      const lastErr = chrome.runtime.lastError
      if (lastErr) { reject(lastErr.message); return }
      if (resp?.ok) {
        setStatus('upload OK')
        resolve()
      } else {
        reject(resp?.error || 'upload failed')
      }
    })
    // transfere o Blob via Offscreen fetch: cria URL e background fará fetch(url).then(r=>r.blob())
    ;(async () => {
      // Para blobs grandes, é melhor usar chrome.runtime.connect e streams; aqui simplificamos.
      const ab = await blob.arrayBuffer()
      chrome.runtime.sendMessage({ type: 'UPLOAD_BLOB_DATA', payload: { filename, kind, bytes: Array.from(new Uint8Array(ab)), endpoint } })
    })()
  })
}

async function startRecording() {
  if (recorder) return
  try {
    mediaStream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: true })
  } catch (e) {
    alert('Permissão negada para captura de tela.')
    return
  }

  chunks = []
  replayBuf = []
  recorder = new MediaRecorder(mediaStream!, { mimeType: MIME })

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
      await sendUploadToBackground(out, `record-${Date.now()}.webm`, 'record', epInput.value.trim())
    } catch (e) {
      setStatus('upload FAIL')
      alert(String(e))
    } finally {
      cleanup()
    }
  }

  recorder.start(1000)
  startAt = Date.now()
  startTimer()
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
    await sendUploadToBackground(blob, `replay-${Date.now()}.webm`, 'replay', epInput.value.trim())
  } catch (e) {
    setStatus('upload FAIL')
    alert(String(e))
  }
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
