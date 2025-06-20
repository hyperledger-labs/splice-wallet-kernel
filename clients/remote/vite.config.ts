import { defineConfig } from 'vite'

import { resolve } from 'path'

export default defineConfig({
    root: 'src/web/frontend',
    resolve: {
        alias: {
            'core-wallet-ui-components': resolve(
                import.meta.dirname,
                '../../core/wallet-ui-components'
            ),
        },
    },
})
