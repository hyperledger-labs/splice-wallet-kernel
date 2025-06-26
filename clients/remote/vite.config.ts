import { defineConfig } from 'vite'

import { resolve } from 'path'

export default defineConfig({
    root: 'src/web/frontend',
    build: {
        outDir: resolve(__dirname, '../../dist/frontend'),
        emptyOutDir: true,
    },
    resolve: {
        alias: {
            'core-wallet-ui-components': resolve(
                import.meta.dirname,
                '../../core/wallet-ui-components'
            ),
            'core-wallet-user-rpc-client': resolve(
                import.meta.dirname,
                '../../core/wallet-user-rpc-client'
            ),
        },
    },
})
