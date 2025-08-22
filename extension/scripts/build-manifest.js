// extension/scripts/build-manifest.js
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function run() {
  const src = path.resolve(__dirname, '..', '..', 'src', 'manifest.json')
  const distDir = path.resolve(__dirname, '..', 'dist')
  const dst = path.join(distDir, 'manifest.json')
  const raw = JSON.parse(await fs.readFile(src, 'utf-8'))

  raw.manifest_version = 3
  raw.background = { service_worker: 'sw.js', type: 'module' }

  await fs.mkdir(distDir, { recursive: true })
  await fs.writeFile(dst, JSON.stringify(raw, null, 2))
  console.log('[build-manifest] manifest.json gerado em dist/')
}

run().catch(e => { console.error('[build-manifest] ERRO:', e); process.exit(1) })
