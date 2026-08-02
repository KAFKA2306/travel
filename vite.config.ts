import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/travel/',
  build: {
    rollupOptions: {
      input: {
        home: 'index.html',
        planner: 'planner/index.html',
      },
    },
  },
})
