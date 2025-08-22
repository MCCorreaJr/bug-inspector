// SUBSTITUA o(s) import(s) pelo bloco abaixo:
import * as FFmpeg from '@ffmpeg/ffmpeg';

const { createFFmpeg, fetchFile } = FFmpeg;

const ffmpeg = createFFmpeg({
  log: true,
  corePath: chrome.runtime.getURL('assets/ffmpeg/ffmpeg-core.js'),
});


const $ = (s: string) => document.querySelector(s) as HTMLElement;
const logEl = $('#log') as HTMLDivElement;
const video = $('#video') as HTMLVideoElement;
const fileInput = $('#file') as HTMLInputElement;
const btnLoadLast = $('#btnLoadLast') as HTMLButtonElement;
const btnProcess = $('#btnProcess') as HTMLButtonElement;
const btnAuto = $('#btnAuto') as HTMLButtonElement;
const dl = $('#download') as HTMLAnchorElement;

const start = $('#start') as HTMLInputElement;
const end = $('#end') as HTMLInputElement;

const bx = $('#bx') as HTMLInputElement;
const by = $('#by') as HTMLInputElement;
const bw = $('#bw') as HTMLInputElement;
const bh = $('#bh') as HTMLInputElement;
const bstr = $('#bstr') as HTMLInputElement;

let currentFile: File | null = null;

function log(msg: string) {
  logEl.textContent += msg + '\n';
  logEl.scrollTop = logEl.scrollHeight;
}

async function loadBlobAsVideo(blob: Blob) {
  const url = URL.createObjectURL(blob);
  video.src = url;
  await video.play().catch(() => {});
}

btnAuto.addEventListener('click', () => {
  if (isFinite(video.duration) && video.duration > 0) {
    start.value = '0';
    end.value = String(Math.floor(video.duration));
  }
});

fileInput.addEventListener('change', async () => {
  const f = fileInput.files?.[0];
  if (!f) return;
  currentFile = f;
  await loadBlobAsVideo(f);
});

btnLoadLast.addEventListener('click', async () => {
  log('Solicitando última captura à extensão...');
  const blob = await new Promise<Blob | null>((resolve) => {
    chrome.runtime.sendMessage({ type: 'EDITOR_GET_LAST' }, (resp) => {
      if (chrome.runtime.lastError) {
        log('Erro: ' + chrome.runtime.lastError.message);
        resolve(null);
      } else {
        if (resp && resp.ok && resp.arrayBuffer) {
          const b = new Blob([resp.arrayBuffer], { type: 'video/webm' });
          resolve(b);
        } else resolve(null);
      }
    });
  });
  if (blob) {
    currentFile = new File([blob], 'last.webm', { type: 'video/webm' });
    await loadBlobAsVideo(blob);
    log('Última captura carregada.');
  } else {
    log('Nenhuma captura encontrada.');
  }
});

btnProcess.addEventListener('click', async () => {
  if (!currentFile) { log('Selecione um arquivo ou carregue a última captura.'); return; }

  const s = Math.max(0, Number(start.value) || 0);
  const e = Math.max(0, Number(end.value) || 0);
  const useTrim = e > 0 && e > s;

  const blurX = Math.max(0, Number(bx.value) || 0);
  const blurY = Math.max(0, Number(by.value) || 0);
  const blurW = Math.max(1, Number(bw.value) || 1);
  const blurH = Math.max(1, Number(bh.value) || 1);
  const blurStr = Math.max(1, Number(bstr.value) || 8);

  const ffmpeg = createFFmpeg({ log: true });
  log('Carregando ffmpeg.wasm... (pode levar alguns segundos)');
  await ffmpeg.load();

  const data = await fetchFile(currentFile);
  ffmpeg.FS('writeFile', 'in.webm', data);

  // Monta filtros: trim (através de -ss/-to) e blur regional via filter_complex
  // Estratégia: split + boxblur + crop + overlay
  // [0:v]split[v][b];[b]boxblur=%(blurStr)s[bb];[bb]crop=%(bw) s:%(bh)s:%(bx)s:%(by)s[c];[v][c]overlay=%(bx)s:%(by)s
  const filter = `[0:v]split[v][b];` +
                 `[b]boxblur=${blurStr}[bb];` +
                 `[bb]crop=${blurW}:${blurH}:${blurX}:${blurY}[c];` +
                 `[v][c]overlay=${blurX}:${blurY}`;

  const args = [
    '-i', 'in.webm',
  ]

  if (useTrim) {
    args.unshift('-to', String(e));
    args.unshift('-ss', String(s));
  }

  args.push(
    '-filter_complex', filter,
    '-map', '0:a?',        # inclui áudio se houver
    '-map', '[v]',         # vídeo filtrado
    '-c:v', 'libvpx-vp9',
    '-b:v', '0',
    '-crf', '35',
    '-c:a', 'copy',
    'out.webm'
  )

  log('Processando...');
  await ffmpeg.run(...args)
  log('Fim do processamento.');

  const out = ffmpeg.FS('readFile', 'out.webm');
  const blob = new Blob([out.buffer], { type: 'video/webm' });
  const url = URL.createObjectURL(blob);
  dl.href = url;
  dl.style.display = 'inline-block';
  dl.textContent = 'Baixar resultado';
  video.src = url;
  log('Pronto! Você pode baixar ou visualizar o resultado.');
});
