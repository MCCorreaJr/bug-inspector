import * as FFmpeg from '@ffmpeg/ffmpeg';
const { createFFmpeg, fetchFile } = FFmpeg;

const coreJs = chrome.runtime.getURL('assets/ffmpeg/ffmpeg-core.js');
const wasm = chrome.runtime.getURL('assets/ffmpeg/ffmpeg-core.wasm');
// Tentativa de worker (pode não existir nessa versão)
const workerJs = chrome.runtime.getURL('assets/ffmpeg/ffmpeg-core.worker.js');

const ffmpeg = createFFmpeg({
  log: true,
  corePath: coreJs,
  // Algumas versões aceitam estes campos extra; se a sua ignorar, não tem problema:
  // (Servem para quando o worker é separado)
  wasmPath: wasm,
  workerPath: workerJs
});




const $ = (s) => document.querySelector(s);
const logEl = $('#log');
const video = $('#video');
const fileInput = $('#file');
const btnLoadLast = $('#btnLoadLast');
const btnProcess = $('#btnProcess');
const btnAuto = $('#btnAuto');
const btnSetStartAtCurrent = $('#btnSetStartAtCurrent');
const btnSetEndAtCurrent = $('#btnSetEndAtCurrent');
const dl = $('#download');

const start = $('#start');
const end = $('#end');

const regionTable = $('#regions');
const btnAddRegion = $('#btnAddRegion');
const presetName = $('#presetName');
const btnSavePreset = $('#btnSavePreset');
const presetSelect = $('#presetSelect');
const btnLoadPreset = $('#btnLoadPreset');
const btnDeletePreset = $('#btnDeletePreset');

const btnAddMarker = $('#btnAddMarker');
const btnClearMarkers = $('#btnClearMarkers');
const markersList = $('#markers');

const endpointInput = $('#endpoint');
const btnUploadEdited = $('#btnUploadEdited');
const uploadedMsg = $('#uploadedMsg');

let currentFile = null;
let regions = []; // {x,y,w,h,str}
let markers = []; // seconds

function log(msg) {
  logEl.textContent += msg + '\n';
  logEl.scrollTop = logEl.scrollHeight;
}

async function loadBlobAsVideo(blob) {
  const url = URL.createObjectURL(blob);
  video.src = url;
  await video.play().catch(() => {});
}

function renderRegions() {
  regionTable.innerHTML = '';
  regions.forEach((r, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx+1}</td>
      <td><input type="number" value="${r.x}" data-idx="${idx}" data-key="x" style="width:80px" /></td>
      <td><input type="number" value="${r.y}" data-idx="${idx}" data-key="y" style="width:80px" /></td>
      <td><input type="number" value="${r.w}" data-idx="${idx}" data-key="w" style="width:80px" /></td>
      <td><input type="number" value="${r.h}" data-idx="${idx}" data-key="h" style="width:80px" /></td>
      <td><input type="number" value="${r.str}" data-idx="${idx}" data-key="str" style="width:80px" /></td>
      <td><button data-idx="${idx}" class="rm">Remover</button></td>
    `;
    regionTable.appendChild(tr);
  });
}

regionTable.addEventListener('input', (e) => {
  const t = e.target;
  if (t.tagName === 'INPUT') {
    const idx = Number(t.dataset.idx);
    const key = t.dataset.key;
    regions[idx][key] = Number(t.value);
  }
});
regionTable.addEventListener('click', (e) => {
  const t = e.target;
  if (t.classList.contains('rm')) {
    const idx = Number(t.dataset.idx);
    regions.splice(idx,1);
    renderRegions();
  }
});

btnAddRegion.addEventListener('click', () => {
  regions.push({ x:100, y:100, w:200, h:120, str:12 });
  renderRegions();
});

// Presets in chrome.storage.local
async function loadPresets() {
  const { blurPresets = {} } = await chrome.storage.local.get({ blurPresets: {} });
  // clear and fill
  presetSelect.innerHTML = '';
  Object.keys(blurPresets).forEach(name => {
    const opt = document.createElement('option');
    opt.value = name; opt.textContent = name;
    presetSelect.appendChild(opt);
  });
  return blurPresets;
}

btnSavePreset.addEventListener('click', async () => {
  const name = (presetName.value || '').trim();
  if (!name) { log('Informe um nome para o preset.'); return; }
  const presets = await loadPresets();
  presets[name] = regions;
  await chrome.storage.local.set({ blurPresets: presets });
  await loadPresets();
  log('Preset salvo.');
});

btnLoadPreset.addEventListener('click', async () => {
  const presets = await loadPresets();
  const sel = presetSelect.value;
  if (!sel || !presets[sel]) { log('Preset não encontrado.'); return; }
  regions = JSON.parse(JSON.stringify(presets[sel]));
  renderRegions();
  log('Preset carregado.');
});

btnDeletePreset.addEventListener('click', async () => {
  const presets = await loadPresets();
  const sel = presetSelect.value;
  if (!sel || !presets[sel]) { log('Selecione um preset.'); return; }
  delete presets[sel];
  await chrome.storage.local.set({ blurPresets: presets });
  await loadPresets();
  log('Preset excluído.');
});

btnAddMarker.addEventListener('click', () => {
  const t = isFinite(video.currentTime) ? Number(video.currentTime.toFixed(2)) : 0;
  markers.push(t);
  renderMarkers();
});
btnClearMarkers.addEventListener('click', () => {
  markers = [];
  renderMarkers();
});
function renderMarkers() {
  markersList.innerHTML = '';
  markers.sort((a,b)=>a-b).forEach((m, i) => {
    const li = document.createElement('li');
    li.textContent = `#${i+1} — ${m}s`;
    markersList.appendChild(li);
  });
}

btnAuto.addEventListener('click', () => {
  if (isFinite(video.duration) && video.duration > 0) {
    start.value = '0';
    end.value = String(Math.floor(video.duration));
  }
});
btnSetStartAtCurrent.addEventListener('click', () => {
  start.value = String(Math.max(0, video.currentTime.toFixed(2)));
});
btnSetEndAtCurrent.addEventListener('click', () => {
  end.value = String(Math.max(0, video.currentTime.toFixed(2)));
});

fileInput.addEventListener('change', async () => {
  const f = fileInput.files?.[0];
  if (!f) return;
  currentFile = f;
  await loadBlobAsVideo(f);
});

btnLoadLast.addEventListener('click', async () => {
  log('Solicitando última captura à extensão...');
  const resp = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'EDITOR_GET_LAST' }, (r) => {
      if (chrome.runtime.lastError) resolve({ ok:false });
      else resolve(r);
    });
  });
  if (resp && resp.ok && resp.arrayBuffer) {
    const blob = new Blob([resp.arrayBuffer], { type: 'video/webm' });
    currentFile = new File([blob], 'last.webm', { type: 'video/webm' });
    await loadBlobAsVideo(blob);
    log('Última captura carregada.');
  } else {
    log('Nenhuma captura encontrada.');
  }
});

// read endpoint from storage
async function getEndpoint() {
  const { endpoint } = await chrome.storage.local.get({ endpoint: 'http://localhost:8787/api/upload' });
  return endpoint || 'http://localhost:8787/api/upload';
}
(async () => {
  endpointInput.value = await getEndpoint();
  await loadPresets();
})();

btnUploadEdited.addEventListener('click', async () => {
  try {
    const url = endpointInput.value.trim() || await getEndpoint();
    const a = dl.getAttribute('href');
    if (!a) { log('Gere o vídeo editado antes (Processar).'); return; }
    const res = await fetch(a);
    const blob = await res.blob();

    const form = new FormData();
    form.append('file', blob, `edited-${Date.now()}.webm`);
    form.append('meta', JSON.stringify({
      kind: 'edited',
      trim: { start: Number(start.value)||0, end: Number(end.value)||0 },
      regions,
      markers,
      ts: Date.now()
    }));
    const r = await fetch(url, { method: 'POST', body: form });
    const j = await r.json();
    if (j && j.url) {
      uploadedMsg.textContent = `Link: ${location.origin.replace(/chrome-extension:\/\/[a-z0-9_]+/i,'http://localhost:8787')}${j.url}`;
      log('Upload OK: ' + j.url);
    } else {
      uploadedMsg.textContent = '';
      log('Upload concluído, mas URL não retornada.');
    }
  } catch (e) {
    log('Falha no upload: ' + e.message);
  }
});

btnProcess.addEventListener('click', async () => {
  if (!currentFile) { log('Selecione um arquivo ou carregue a última captura.'); return; }

  const s = Math.max(0, Number(start.value) || 0);
  const e = Math.max(0, Number(end.value) || 0);
  const useTrim = e > 0 && e > s;

  const ffmpeg = createFFmpeg({ log: true });
  log('Carregando ffmpeg.wasm...');
  await ffmpeg.load();

  const data = await fetchFile(currentFile);
  ffmpeg.FS('writeFile', 'in.webm', data);

  // Build filter graph with multiple regions
  // Start with split main for overlay chain
  let graph = `[0:v]split[v0]`;
  let lastLabel = 'v0';
  regions.forEach((r, i) => {
    const bx = Math.max(0, r.x|0), by = Math.max(0, r.y|0);
    const bw = Math.max(1, r.w|0), bh = Math.max(1, r.h|0);
    const bs = Math.max(1, r.str|0);
    const bl = `b${i}`; // blur label base
    const cr = `c${i}`;
    const ov = `o${i}`;
    graph += `;[${lastLabel}]split[${lastLabel}][${bl}]`;
    graph += `;[${bl}]boxblur=${bs}:${bs}[${bl}]`;
    graph += `;[${bl}]crop=${bw}:${bh}:${bx}:${by}[${cr}]`;
    graph += `;[${lastLabel}][${cr}]overlay=${bx}:${by}[${ov}]`;
    lastLabel = ov;
  });

  const args = [];
  if (useTrim) {
    args.push('-ss', String(s), '-to', String(e));
  }
  args.push('-i', 'in.webm',
            '-filter_complex', graph,
            '-map', '0:a?',
            '-map', `[${lastLabel}]`,
            '-c:v', 'libvpx-vp9',
            '-b:v', '0',
            '-crf', '35',
            '-c:a', 'copy',
            'out.webm');

  log('Processando...');
  await ffmpeg.run(...args);
  log('Fim do processamento.');

  const out = ffmpeg.FS('readFile', 'out.webm');
  const blob = new Blob([out.buffer], { type: 'video/webm' });
  const url = URL.createObjectURL(blob);
  dl.href = url;
  dl.style.display = 'inline-block';
  dl.textContent = 'Baixar resultado';
  video.src = url;
  log('Pronto! Você pode baixar, visualizar ou fazer upload.');
});
