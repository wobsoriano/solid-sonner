import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'

export default defineConfig(() => {
  return {
    plugins: [
      solidPlugin({
        // https://github.com/solidjs/solid-refresh/issues/29
        hot: false,
      }),
    ],
    resolve: {
      conditions: ['browser', 'development'],
    },
  }
})
