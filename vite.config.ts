import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Pin the clock for tests so date/time assertions never depend on the
  // machine's timezone. Set here rather than in the npm script so a direct
  // `npx vitest` run behaves identically.
  test: {
    env: { TZ: 'Asia/Tokyo' },
  },
})
