# Bug‑Inspector — pacote revisado (servidor + extensão + testes)

## 1) Servidor
```
cd server
npm i
npm run test
npm run dev
```
Uploads vão para `server/storage/`. Rotas: `/api/upload`, `/files`, `/download/:name`, `/view/:name`, `/health`.

## 2) Extensão (build a partir de `src/`)
```
cd src
npm i
npm run build
```
Gera `extension/dist/` com `manifest.json`, **`sw.js` na raiz**, `popup.html`, `editor.html`, `offscreen.html`, `assets/` e `assets/ffmpeg/*`.

Carregue no Chrome: `chrome://extensions` → **Modo desenvolvedor** → **Carregar sem compactar** → selecione `extension/dist`.

Na popup, configure o endpoint: `http://localhost:8787/api/upload`.
