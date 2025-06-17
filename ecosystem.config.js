export const apps = [
    {
        name: 'remote',
        script: 'yarn workspace server dev',
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
        name: 'splice-provider',
        script: 'yarn workspace splice-provider dev',
    },
    {
        name: 'wallet-ui-components',
        script: 'yarn workspace wallet-ui-components build:watch',
    },
]
