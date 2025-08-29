<<<<<<< HEAD
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import Fastify from 'fastify';
import fastifyMultipart from '@fastify/multipart';
import fastifyCors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
=======
import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import { pipeline } from 'node:stream/promises'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import archiver from 'archiver'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const STORAGE_DIR = path.join(ROOT, 'storage')
const ENABLE_TRANSCODE = String(process.env.ENABLE_TRANSCODE || 'false').toLowerCase() === 'true'
>>>>>>> dc6e9ea6ee94c62a9586211b26b576a62c26d4cc

// Configuração do diretório de armazenamento
const STORAGE_DIR = path.join(__dirname, '..', 'storage');

// Garante que o diretório de armazenamento exista
await fs.mkdir(STORAGE_DIR, { recursive: true });

// Configuração do servidor
const fastify = Fastify({
  logger: process.env.NODE_ENV === 'test' ? false : {
    level: 'info',
    transport: process.env.NODE_ENV !== 'production' ? {
      target: 'pino-pretty',
      options: {
        colorize: true
      }
    } : undefined
  }
});

// Plugins
await fastify.register(fastifyCors, {
  origin: '*'
});
await fastify.register(fastifyMultipart, {
  limits: {
    fileSize: 500 * 1024 * 1024, // 500 MB
  },
});

// Servir arquivos estáticos do diretório de armazenamento
await fastify.register(fastifyStatic, {
  root: STORAGE_DIR,
  prefix: '/files/',
  decorateReply: false // Para evitar conflito com o fastify-static da extensão
});

// Servir arquivos estáticos da extensão
fastify.register(fastifyStatic, {
  root: path.join(__dirname, '../../extension/dist'),
  prefix: '/extension/', // A extensão será acessível via /extension/manifest.json, etc.
  decorateReply: false // Para evitar conflito com o fastify-static principal
});

// Rota para download do ZIP da extensão
fastify.get('/download-extension', async (request, reply) => {
  const extensionPath = path.join(__dirname, '../../extension/dist');
  const zipPath = path.join(__dirname, '../storage/bug-inspector-extension.zip');

  try {
    const output = require('fs').createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(archive.pointer() + ' total bytes');
      console.log('archiver has been finalized and the output file descriptor has closed.');
    });

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(output);
    archive.directory(extensionPath, false);
    await archive.finalize();

    reply.download(zipPath, 'bug-inspector-extension.zip');
  } catch (error) {
    fastify.log.error('Erro ao gerar ou servir ZIP da extensão:', error);
    reply.code(500).send({ error: 'Erro ao gerar ou servir ZIP da extensão' });
  }
});

// Função para sanitizar nomes de arquivo
function sanitizeFilename(filename) {
  return filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

// Função para gerar nome de arquivo único
function generateUniqueFilename(originalName, type) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sanitizedName = sanitizeFilename(originalName);
  return `${type}_${timestamp}_${sanitizedName}`;
}

<<<<<<< HEAD
// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    storage: STORAGE_DIR
  };
});
=======
async function transcodeToMp4(srcWebm) {
  const base = path.basename(srcWebm, path.extname(srcWebm))
  const dst = path.join(STORAGE_DIR, `${base}.mp4`)

  return new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-i', srcWebm,
      // H.264 baseline p/ compatibilidade ampla
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
      // áudio AAC padrão
      '-c:a', 'aac', '-b:a', '128k',
      dst
    ]
    const ff = spawn('ffmpeg', args, { stdio: 'ignore' })
    ff.on('error', reject)
    ff.on('close', (code) => code === 0 ? resolve(dst) : reject(new Error(`ffmpeg exit ${code}`)))
  })
}

export async function buildServer() {
  await ensureStorage()
  const app = Fastify({ logger: true })
>>>>>>> dc6e9ea6ee94c62a9586211b26b576a62c26d4cc

// Listar arquivos no storage
fastify.get('/files', async (request, reply) => {
  try {
    const files = await fs.readdir(STORAGE_DIR);
    const fileDetails = await Promise.all(files.map(async (file) => {
      const filePath = path.join(STORAGE_DIR, file);
      const stats = await fs.stat(filePath);
      return {
        name: file,
        size: stats.size,
        created: stats.birthtime.toISOString(),
        modified: stats.mtime.toISOString(),
        url: `/view/${file}`,
        downloadUrl: `/download/${file}`
      };
    }));
    return {
      files: fileDetails,
      total: fileDetails.length,
      totalSize: fileDetails.reduce((acc, file) => acc + file.size, 0)
    };
  } catch (error) {
    fastify.log.error('Erro ao listar arquivos:', error);
    reply.code(500).send({ error: 'Erro ao listar arquivos' });
  }
});

// Visualizar arquivo
fastify.get('/view/:filename', async (request, reply) => {
  const filename = request.params.filename;
  const filePath = path.join(STORAGE_DIR, filename);
  try {
    await fs.access(filePath);
    reply.type('text/html').send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${filename}</title>
        <style>
          body { margin: 0; overflow: hidden; background-color: #000; }
          video { width: 100vw; height: 100vh; object-fit: contain; }
        </style>
      </head>
      <body>
        <video controls autoplay src="/files/${filename}"></video>
      </body>
      </html>
    `);
  } catch (error) {
    fastify.log.error(`Arquivo não encontrado: ${filename}`, error);
    reply.code(404).send({ error: 'Arquivo não encontrado' });
  }
});

// Download de arquivo
fastify.get('/download/:filename', async (request, reply) => {
  const filename = request.params.filename;
  const filePath = path.join(STORAGE_DIR, filename);
  try {
    await fs.access(filePath);
    reply.download(filePath, filename);
  } catch (error) {
    fastify.log.error(`Arquivo não encontrado para download: ${filename}`, error);
    reply.code(404).send({ error: 'Arquivo não encontrado' });
  }
});

// Endpoint principal de upload
fastify.post('/api/upload', async (request, reply) => {
  try {
    const data = await request.file();
    
    if (!data) {
      return reply.code(400).send({ 
        error: 'Nenhum arquivo enviado',
        details: 'O campo de arquivo é obrigatório'
      });
    }

    // Verificar se o arquivo não está vazio
    const buffer = await data.toBuffer();
    if (buffer.length === 0) {
      return reply.code(422).send({ 
        error: 'Arquivo vazio',
        details: 'O arquivo enviado não contém dados'
      });
    }

    // Obter metadados do formulário
    const fields = {};
    
    // Processar campos adicionais do multipart
    const parts = request.parts();
    for await (const part of parts) {
<<<<<<< HEAD
      if (part.type === 'field') {
        fields[part.fieldname] = part.value;
=======
      if (part.type === 'file') {
        const original = sanitizeName(part.filename)
        const prefix = part.fieldname === 'replay' ? 'replay' : (part.fieldname === 'record' ? 'record' : 'file')
        const name = `${prefix}-${Date.now()}-${original || 'clip.webm'}`
        const dest = path.join(STORAGE_DIR, name)
        await pipeline(part.file, fs.createWriteStream(dest))
        const st = await fsp.stat(dest)
        if (st.size === 0) { await fsp.unlink(dest); return reply.code(422).send({ error: 'Arquivo vazio recebido' }) }
        saved.push({ name, size: st.size })

        // transcodificação opcional
        if (ENABLE_TRANSCODE && name.endsWith('.webm')) {
          try {
            const mp4 = await transcodeToMp4(dest)
            saved.push({ name: path.basename(mp4), size: (await fsp.stat(mp4)).size })
          } catch (e) {
            req.log.warn({ err: String(e) }, 'ffmpeg transcode falhou')
          }
        }
      } else if (part.type === 'field' && part.fieldname === 'meta') {
        try { meta = JSON.parse(part.value) } catch {}
>>>>>>> dc6e9ea6ee94c62a9586211b26b576a62c26d4cc
      }
    }

    // Determinar tipo de gravação
    const recordingType = fields.type || data.fieldname || 'recording';
    
    // Gerar nome único para o arquivo
    const filename = generateUniqueFilename(data.filename, recordingType);
    const filePath = path.join(STORAGE_DIR, filename);

    // Salvar arquivo
    await fs.writeFile(filePath, buffer);
    
    // Verificar se foi salvo corretamente
    const stats = await fs.stat(filePath);
    
    fastify.log.info(`Arquivo salvo: ${filename} (${stats.size} bytes)`);

    return {
      success: true,
      filename,
      originalName: data.filename,
      size: stats.size,
      type: recordingType,
      savedAt: new Date().toISOString(),
      viewUrl: `/view/${filename}`,
      downloadUrl: `/download/${filename}`,
      metadata: fields
    };

  } catch (error) {
    fastify.log.error('Erro no upload:', error);
    return reply.code(500).send({ 
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// Inicializar servidor
const start = async () => {
  try {
    await fastify.listen({ port: 8787, host: '0.0.0.0' });
    fastify.log.info(`Servidor rodando em: ${fastify.server.address().address}:${fastify.server.address().port}`);
    console.log('🐛 Bug Inspector Server');
    console.log(`📡 Servidor rodando em: http://0.0.0.0:8787`);
    console.log(`📁 Storage: ${STORAGE_DIR}`);
    console.log('🔗 Endpoints:');
    console.log('   - POST /api/upload (upload de arquivos)');
    console.log('   - GET  /files (listar arquivos)');
    console.log('   - GET  /view/:filename (visualizar)');
    console.log('   - GET  /download/:filename (download)');
    console.log('   - GET  /health (status)');
    console.log('   - GET  /download-extension (download ZIP da extensão)');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();


