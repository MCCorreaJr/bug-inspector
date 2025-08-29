import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: __dirname,
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        offscreen: resolve(__dirname, 'offscreen.html'),
        editor: resolve(__dirname, 'editor.html'),
        sw: resolve(__dirname, 'sw.ts'),
        content: resolve(__dirname, 'content.ts'),
        'editor-advanced': resolve(__dirname, 'editor-advanced.js')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (['sw', 'content', 'editor-advanced'].includes(chunkInfo.name)) {
            return '[name].js';
          }
          return 'assets/[name].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
});
