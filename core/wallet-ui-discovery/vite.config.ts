import { defineConfig } from 'vite'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        dts({ include: ['lib'], tsconfigPath: './tsconfig.app.json' }),
    ],
    build: {
        copyPublicDir: false,
        lib: {
            entry: resolve(__dirname, 'lib/index.tsx'),
            formats: ['es'],
        },
    },
})
