export type UploadKind = 'record' | 'replay';

export async function uploadBlob(
  endpoint: string,
  bytes: number[] | Uint8Array,
  filename: string,
  kind: UploadKind
) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  const blob = new Blob([data], { type: 'video/webm' })
  if (!blob.size) throw new Error('Blob vazio')

  const fd = new FormData()
  fd.append(kind === 'replay' ? 'replay' : 'record', blob, filename || 'clip.webm')
  fd.append('meta', JSON.stringify({ kind, ts: Date.now() }))

  const res = await fetch(endpoint, { method: 'POST', body: fd })
  if (!res.ok) throw new Error(`Upload falhou: ${res.status}`)
  return res.json()
}
