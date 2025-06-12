import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            'core-wallet-dapp-rpc-client': path.resolve(
                __dirname,
                '../core/wallet-dapp-rpc-client'
            ),
        },
    },
})
