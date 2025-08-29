// Overlay visual (opcional) para "Record Tab"
(() => {
  if ((window as any).__biOverlay) return
  (window as any).__biOverlay = true

  const bar = document.createElement('div')
  Object.assign(bar.style, {
    position:'fixed', left:'20px', bottom:'20px', zIndex:'2147483647',
    background:'rgba(25,25,25,.92)', color:'#fff', padding:'8px 12px',
    borderRadius:'10px', boxShadow:'0 8px 24px rgba(0,0,0,.3)', display:'none',
    fontFamily:'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
  })
  bar.textContent = 'Recording… 00:00'
  document.documentElement.appendChild(bar)

  let t: any=null, start=0
  function tick(){
    const s = Math.floor((Date.now()-start)/1000)
    const mm = String(Math.floor(s/60)).padStart(2,'0')
    const ss = String(s%60).padStart(2,'0')
    bar.textContent = `Recording… ${mm}:${ss}`
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === 'TAB_OVERLAY') {
      bar.style.display = 'block'
      start = Date.now()
      if (t) clearInterval(t)
      t = setInterval(tick, 250)
    }
  })
})()
