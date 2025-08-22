// extension/scripts/copy-ffmpeg-core.js
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import fsp from 'node:fs/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const candidates = [
  ['..', '..', 'src', 'node_modules', '@ffmpeg', 'core', 'dist'],
  ['..', 'node_modules', '@ffmpeg', 'core', 'dist'],
  ['..', '..', 'extension', 'node_modules', '@ffmpeg', 'core', 'dist'],
  ['..', '..', 'node_modules', '@ffmpeg', 'core', 'dist']
].map(parts => path.resolve(__dirname, ...parts))

async function findDist() {
  for (const dir of candidates) {
    try {
      const js = path.join(dir, 'ffmpeg-core.js')
      await fsp.access(js, fs.constants.R_OK)
      return dir
    } catch {}
  }
  throw new Error('Não encontrei @ffmpeg/core/dist em nenhum candidato')
}

async function run() {
  const src = await findDist()
  const dest = path.resolve(__dirname, '..', 'dist', 'assets', 'ffmpeg')
  await fsp.mkdir(dest, { recursive: true })
  for (const name of ['ffmpeg-core.js', 'ffmpeg-core.wasm', 'ffmpeg-core.worker.js']) {
    await fsp.copyFile(path.join(src, name), path.join(dest, name))
  }
  console.log(`[copy-ffmpeg-core] OK → ${dest}`)
}

run().catch(err => { console.error('[copy-ffmpeg-core] ERRO:', err.message); process.exit(1) })
