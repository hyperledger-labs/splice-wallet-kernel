export const apps = [
    {
        name: 'remote',
        script: 'yarn workspace clients-remote dev',
    },
    {
        name: 'extension',
        script: 'yarn workspace clients-extension dev',
    },
    {
        name: 'example dApp',
        script: 'yarn workspace example dev',
    },
    {
        name: 'splice-wallet-sdk',
        script: 'yarn workspace splice-wallet-sdk dev',
    },
    {
        name: 'core-splice-provider',
        script: 'yarn workspace core-splice-provider dev',
    },
    {
        name: 'core-wallet-ui-components',
        script: 'yarn workspace core-wallet-ui-components build:watch',
    },
]
