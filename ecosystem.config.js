export const apps = [
    {
        name: 'remote',
        script: 'yarn workspace clients-remote dev',
    },
    {
        name: 'mock-oauth2-server',
        script: 'yarn start:oauth2-mock-server',
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
        name: 'core-ledger-client',
        script: 'yarn workspace core-ledger-client dev',
    },
    {
        name: 'core-splice-provider',
        script: 'yarn workspace core-splice-provider dev',
    },
    {
        name: 'core-wallet-ui-components',
        script: 'yarn workspace core-wallet-ui-components build:watch',
    },
    {
        name: 'core-wallet-store',
        script: 'yarn workspace core-wallet-store dev',
    },
    {
        name: 'core-wallet-user-rpc-client',
        script: 'yarn workspace core-wallet-user-rpc-client dev',
    },
    {
        name: 'core-wallet-dapp-rpc-client',
        script: 'yarn workspace core-wallet-dapp-rpc-client dev',
    },
    {
        name: 'core-types',
        script: 'yarn workspace core-types dev',
    },
]
