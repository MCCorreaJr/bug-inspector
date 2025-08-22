// server/src/index.js
import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import { pipeline } from 'node:stream/promises'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const STORAGE_DIR = path.join(ROOT, 'storage')

function sanitizeName(name) {
  return (name || 'upload.webm')
    .replace(/\\/g, '_')
    .replace(/\//g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
}

async function ensureStorage() {
  await fsp.mkdir(STORAGE_DIR, { recursive: true })
}

export async function buildServer() {
  await ensureStorage()
  const app = Fastify({ logger: true })

  await app.register(cors, {
    origin: [/^(chrome-extension:\/\/|moz-extension:\/\/)/, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:8787', 'http://127.0.0.1:8787'],
    methods: ['GET', 'POST', 'OPTIONS']
  })

  await app.register(multipart, { limits: { fileSize: 200 * 1024 * 1024 } })
  await app.register(fastifyStatic, { root: STORAGE_DIR, prefix: '/view/', decorateReply: false })

  app.get('/health', async () => ({ ok: true }))

  app.get('/files', async () => (await fsp.readdir(STORAGE_DIR)).sort().reverse())

  app.get('/download/:name', async (req, reply) => {
    const name = sanitizeName(req.params.name)
    const filePath = path.join(STORAGE_DIR, name)
    try { await fsp.access(filePath, fs.constants.R_OK) } catch { return reply.code(404).send({ error: 'Not found' }) }
    reply.header('Content-Disposition', `attachment; filename="${name}"`)
    return reply.send(fs.createReadStream(filePath))
  })

  app.post('/api/upload', async (req, reply) => {
    const parts = req.parts()
    let saved = []
    let meta = {}

    for await (const part of parts) {
      if (part.type === 'file') {
        const original = sanitizeName(part.filename)
        const prefix = part.fieldname === 'replay' ? 'replay' : (part.fieldname === 'record' ? 'record' : 'file')
        const name = `${prefix}-${Date.now()}-${original || 'clip.webm'}`
        const dest = path.join(STORAGE_DIR, name)
        await pipeline(part.file, fs.createWriteStream(dest))
        const st = await fsp.stat(dest)
        if (st.size === 0) { await fsp.unlink(dest); return reply.code(422).send({ error: 'Arquivo vazio recebido' }) }
        saved.push({ name, size: st.size })
      } else if (part.type === 'field' && part.fieldname === 'meta') {
        try { meta = JSON.parse(part.value) } catch {}
      }
    }

    if (saved.length === 0) return reply.code(400).send({ error: 'Nenhum arquivo enviado' })
    return reply.send({ ok: true, files: saved, meta })
  })

  return app
}

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 8787
  buildServer().then(app => app.listen({ port: PORT, host: '0.0.0.0' }))
}
