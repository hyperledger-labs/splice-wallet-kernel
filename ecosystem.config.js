const sharedEnvDevelopment = {
    NODE_ENV: 'development',
    DEBUG: 'true',
}

export const apps = [
    {
        name: 'remote',
        script: 'yarn workspace clients-remote dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'mock-oauth2-server',
        script: 'yarn workspace mock-oauth2 start',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'extension',
        script: 'yarn workspace clients-extension dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'example',
        script: 'yarn workspace example dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'splice-wallet-sdk',
        script: 'yarn workspace splice-sdk-dapp dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'core-ledger-client',
        script: 'yarn workspace core-ledger-client dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'core-splice-provider',
        script: 'yarn workspace core-splice-provider dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'core-wallet-auth',
        script: 'yarn workspace core-wallet-auth dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'core-wallet-ui-components',
        script: 'yarn workspace core-wallet-ui-components build:watch',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'core-wallet-store',
        script: 'yarn workspace core-wallet-store dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'core-wallet-user-rpc-client',
        script: 'yarn workspace core-wallet-user-rpc-client dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'core-wallet-dapp-rpc-client',
        script: 'yarn workspace core-wallet-dapp-rpc-client dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'core-types',
        script: 'yarn workspace core-types dev',
        env_development: sharedEnvDevelopment,
    },
]
