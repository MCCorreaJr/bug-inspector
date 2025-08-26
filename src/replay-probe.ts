// Obtém streamId da guia ativa (sem abrir picker) e envia ao SW.
// O clique no popup é o "user gesture" necessário.
(() => {
  if ((window as any).__biProbeRan) return
  ;(window as any).__biProbeRan = true

  try {
    chrome.tabCapture.getMediaStreamId((streamId) => {
      if (chrome.runtime.lastError || !streamId) {
        chrome.runtime.sendMessage({
          type: 'PROBE_STREAM_ID',
          streamId: null,
          error: chrome.runtime.lastError?.message || 'Falha ao obter streamId'
        })
        return
      }
      chrome.runtime.sendMessage({ type: 'PROBE_STREAM_ID', streamId })
    })
  } catch (e:any) {
    chrome.runtime.sendMessage({ type: 'PROBE_STREAM_ID', streamId: null, error: String(e?.message || e) })
  }
})()
