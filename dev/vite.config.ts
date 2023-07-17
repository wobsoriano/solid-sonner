import path from 'node:path'
import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'

export default defineConfig({
  plugins: [
    solidPlugin(),
    {
      name: 'Replace env variables',
      transform(code, id) {
        if (id.includes('node_modules'))
          return code

        return code
          .replace(/process\.env\.SSR/g, 'false')
          .replace(/process\.env\.DEV/g, 'true')
          .replace(/process\.env\.PROD/g, 'false')
          .replace(/process\.env\.NODE_ENV/g, '"development"')
          .replace(/import\.meta\.env\.SSR/g, 'false')
          .replace(/import\.meta\.env\.DEV/g, 'true')
          .replace(/import\.meta\.env\.PROD/g, 'false')
          .replace(/import\.meta\.env\.NODE_ENV/g, '"development"')
      },
    },
  ],
  server: {
    port: 4173,
  },
  build: {
    target: 'esnext',
  },
  resolve: {
    alias: {
      'solid-sonner': path.resolve(__dirname, '../src'),
    },
  },
})
