// server/test/upload.test.js (Windows-safe paths)
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import FormData from 'form-data'
import { buildServer } from '../src/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const STORAGE = path.resolve(path.join(__dirname, '..', 'storage'))

let app

describe('API Upload', () => {
  beforeAll(async () => { app = await buildServer() })
  afterAll(async () => { await app.close() })

  it('POST /api/upload — salva arquivo válido', async () => {
    const form = new FormData()
    const buf = Buffer.from('webm-binary-mock')
    form.append('record', buf, { filename: 'test.webm', contentType: 'video/webm' })
    form.append('meta', JSON.stringify({ kind: 'recording', note: 'unit' }))

    const res = await app.inject({ method: 'POST', url: '/api/upload', headers: form.getHeaders(), payload: form })
    expect(res.statusCode).toBe(200)
    const json = res.json()
    expect(json.ok).toBe(true)
    expect(json.files?.[0]?.name).toMatch(/record-\d+-test\.webm$/)

    const filePath = path.join(STORAGE, json.files[0].name)
    const stat = await fsp.stat(filePath)
    expect(stat.size).toBeGreaterThan(0)
    await fsp.unlink(filePath)
  })

  it('POST /api/upload — sem arquivo -> 400', async () => {
    const form = new FormData()
    form.append('meta', JSON.stringify({ noop: true }))
    const res = await app.inject({ method: 'POST', url: '/api/upload', headers: form.getHeaders(), payload: form })
    expect(res.statusCode).toBe(400)
  })

  it('POST /api/upload — arquivo vazio -> 422', async () => {
    const form = new FormData()
    const empty = Buffer.alloc(0)
    form.append('record', empty, { filename: 'empty.webm', contentType: 'video/webm' })
    const res = await app.inject({ method: 'POST', url: '/api/upload', headers: form.getHeaders(), payload: form })
    expect(res.statusCode).toBe(422)
  })

  it('GET /files — lista (smoke)', async () => {
    const res = await app.inject({ method: 'GET', url: '/files' })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json())).toBe(true)
  })

  it('GET /health — ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true })
  })
})
