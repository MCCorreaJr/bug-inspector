const ep = document.getElementById('endpoint') as HTMLInputElement
const btnOpenRecorder   = document.getElementById('btnOpenRecorder') as HTMLDivElement
const btnRecordTab      = document.getElementById('btnRecordTab') as HTMLDivElement
const btnInstantReplay  = document.getElementById('btnInstantReplay') as HTMLDivElement

ep.value = localStorage.getItem('bi:endpoint') || 'http://localhost:8787/api/upload'
const persistEndpoint = () => {
  const val = ep.value.trim()
  localStorage.setItem('bi:endpoint', val)
  chrome.storage.local.set({ endpoint: val }).catch(() => {})
}
ep.addEventListener('change', persistEndpoint)
persistEndpoint()

function alertErr(e: unknown) {
  const msg = (e as any)?.message || String(e)
  console.error('[popup] error:', msg)
  alert(msg)
}

function isCapturableUrl(url?: string | null) {
  if (!url) return false
  return /^https?:\/\//i.test(url) || /^file:\/\//i.test(url)
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) throw new Error('Sem guia ativa')
  return tab
}

// Abre gravador clássico (picker do Chrome)
btnOpenRecorder.addEventListener('click', async () => {
  try {
    persistEndpoint()
    const url = chrome.runtime.getURL('recorder.html')
    await chrome.tabs.create({ url })
    window.close()
  } catch (e) { alertErr(e) }
})

// Record Tab (se quiser overlay — opcional; conteúdo atual é “vazio”)
btnRecordTab.addEventListener('click', async () => {
  try {
    persistEndpoint()
    const tab = await getActiveTab()
    if (!isCapturableUrl(tab.url)) {
      throw new Error('Esta guia não pode ser capturada (chrome://, Web Store, páginas internas). Abra um site http/https e tente novamente.')
    }
    await chrome.scripting.executeScript({ target: { tabId: tab.id! }, files: ['assets/content.js'] })
    await chrome.tabs.sendMessage(tab.id!, { type: 'TAB_OVERLAY' })
    window.close()
  } catch (e) { alertErr(e) }
})

// Instant Replay — garante offscreen, pega streamId e abre modal
btnInstantReplay.addEventListener('click', async () => {
  try {
    persistEndpoint()
    const tab = await getActiveTab()
    if (!isCapturableUrl(tab.url)) {
      throw new Error('Instant Replay indisponível nesta página (chrome://, Web Store, páginas internas). Abra um site http/https e tente novamente.')
    }

    const prep = await chrome.runtime.sendMessage({ type: 'REPLAY_ENSURE_RUNNING', tabId: tab.id })
    if (prep && prep.ok === false) throw new Error(prep.error || 'Não foi possível preparar o Replay')

    await chrome.scripting.executeScript({ target: { tabId: tab.id! }, files: ['assets/replay-probe.js'] })
    await chrome.scripting.executeScript({ target: { tabId: tab.id! }, files: ['assets/replay-modal.js'] })
    await chrome.tabs.sendMessage(tab.id!, { type: 'OPEN_REPLAY_MODAL' })
    window.close()
  } catch (e) { alertErr(e) }
})
