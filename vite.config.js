import {defineConfig} from'vite'
import mkcert from 'vite-plugin-mkcert'
import topLevelAwait from 'vite-plugin-top-level-await'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    https: true
  },
  // build: {
  //   minify: false,
  // },
  plugins: [mkcert(), topLevelAwait()]
})