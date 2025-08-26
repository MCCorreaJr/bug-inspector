import { resolve } from 'node:path'

export default {
  root: resolve(__dirname),
  publicDir: false,
  build: {
    outDir: resolve(__dirname, '../extension/dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup:          resolve(__dirname, 'popup.html'),
        recorder:       resolve(__dirname, 'editor.html'),     // se quiser manter como placeholder
        sw:             resolve(__dirname, 'sw.ts'),
        content:        resolve(__dirname, 'content.ts'),
        'replay-modal': resolve(__dirname, 'replay-modal.ts'),
        offscreen:      resolve(__dirname, 'offscreen.html'),
        'replay-probe': resolve(__dirname, 'replay-probe.ts')
      },
      output: {
        entryFileNames: (chunk) => chunk.name === 'sw' ? '[name].js' : 'assets/[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (asset) =>
          asset.name?.endsWith('.css') ? 'assets/[name]-[hash][extname]' : 'assets/[name][extname]'
      }
    }
  }
}
