const ep = document.getElementById('endpoint') as HTMLInputElement
const btn = document.getElementById('openRecorder') as HTMLButtonElement

ep.value = localStorage.getItem('bi:endpoint') || 'http://localhost:8787/api/upload'
ep.addEventListener('change', () => localStorage.setItem('bi:endpoint', ep.value))

btn.addEventListener('click', async () => {
  localStorage.setItem('bi:endpoint', ep.value.trim())
  const url = chrome.runtime.getURL('recorder.html')
  await chrome.tabs.create({ url })
  window.close()
})
