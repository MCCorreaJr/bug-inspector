import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        sw: 'src/sw.ts',
        popup: 'src/popup.html',
        content: 'src/content.ts',
        offscreen: 'src/offscreen.html',
        editor: 'src/editor.html'
      },
      output: {
        entryFileNames: assetInfo => {
          const name = assetInfo.name.replace('src/', '').replace('.ts', '')
          if (name === 'sw') return 'sw.js'
          if (name === 'content') return 'content.js'
          return 'assets/[name].js'
        },
        assetFileNames: 'assets/[name][extname]'
      }
    }
  }
})
