(() => {
  if ((window as any).__biReplayModal) return
  ;(window as any).__biReplayModal = true

  function close() {
    root.remove()
    ;(window as any).__biReplayModal = false
  }

  const root = document.createElement('div')
  Object.assign(root.style, { position:'fixed', inset:'0', background:'rgba(0,0,0,.45)', zIndex:'2147483647', display:'none' })
  const panel = document.createElement('div')
  Object.assign(panel.style, {
    position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)',
    width:'720px', maxWidth:'95vw', background:'#fff', borderRadius:'12px',
    boxShadow:'0 12px 48px rgba(0,0,0,.35)', padding:'16px',
    fontFamily:'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
  })
  panel.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
      <div style="font-weight:600; font-size:16px;">Instant Replay</div>
      <button id="biClose" style="border:none;background:transparent;font-size:18px;cursor:pointer;">✕</button>
    </div>
    <div style="border:1px solid #eee; border-radius:10px; padding:12px; margin:10px 0;">
      <div style="font-size:13px; color:#555;">Salvar últimos <strong>3 minutos</strong> da guia atual.</div>
      <div id="biStatus" style="margin-top:8px; font-size:12px; color:#666;">Inicializando replay…</div>
    </div>
    <div style="display:flex; gap:10px; justify-content:flex-end;">
      <button id="biSave" style="padding:8px 12px; border-radius:8px; border:1px solid #ddd; background:#111; color:#fff; cursor:pointer;">Save last 3 min</button>
    </div>`
  root.appendChild(panel)
  document.documentElement.appendChild(root)

  const btnClose = panel.querySelector('#biClose') as HTMLButtonElement
  const btnSave  = panel.querySelector('#biSave') as HTMLButtonElement
  const status   = panel.querySelector('#biStatus') as HTMLDivElement

  btnClose.onclick = close
  btnSave.onclick = async () => {
    btnSave.disabled = true; btnSave.textContent = 'Saving…'; status.textContent = 'Enviando para o servidor…'
    try {
      const res = await chrome.runtime.sendMessage({ type: 'REPLAY_SAVE_CURRENT_TAB' })
      if (res?.ok) { btnSave.textContent = 'Done!'; status.textContent = 'Replay salvo com sucesso.'; setTimeout(close, 1200) }
      else { throw new Error(res?.error || 'Falha no upload') }
    } catch (e:any) {
      status.textContent = 'Erro: ' + (e?.message || e)
      btnSave.disabled = false; btnSave.textContent = 'Save last 3 min'
    }
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === 'OPEN_REPLAY_MODAL') {
      root.style.display = 'block'
      chrome.runtime.sendMessage({ type: 'REPLAY_STATUS' }).then((r:any) => {
        if (r?.ok && r.active) status.textContent = 'Buffer ativo. Clique para salvar.'
        else status.textContent = 'Preparando buffer… interaja na página por 1-2s e tente salvar.'
      })
    }
  })
})()
