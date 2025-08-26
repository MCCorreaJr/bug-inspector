# bug‑inspector

Extensão MV3 para gravação de tela e **Replay contínuo** (buffer de 3 minutos) com upload para backend Fastify.

## O que mudou
- **Replay estilo Jam.dev:** ao abrir o gravador, o Chrome mostra **uma única vez** o seletor de captura. Após conceder, o replay fica **sempre ativo** em um buffer circular de **3 minutos**.  
- O botão **Salvar Replay** salva retroativamente os **últimos 180s**, **independente** da gravação normal.

## Requisitos
- Node 20+
- Chrome/Edge (MV3)
- (Opcional) `ffmpeg` no PATH (para o servidor gerar `.mp4` se habilitar transcode)

## Fluxo
1. Popup → **Abrir gravador** (abre `recorder.html`).
2. Na primeira abertura, o Chrome pedirá para selecionar **guia/janela/tela** → confirme.  
   - Depois disso, **Replay** fica ativo automaticamente (buffer de 3 min).  
3. **Gravação normal** (Start/Stop) é opcional e independente.
4. **Salvar Replay** → envia os últimos 3 min para o endpoint.
5. Arquivos aparecem em `server/storage/` e listam em `/files`.

## Build da extensão
```powershell
cd src
npm i
npm run build
