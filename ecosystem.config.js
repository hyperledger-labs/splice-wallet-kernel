const sharedEnvDevelopment = {
    NODE_ENV: 'development',
    DEBUG: 'true',
}

export const apps = [
    {
        name: 'remote',
        script: 'yarn workspace @splice/clients-remote dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'mock-oauth2-server',
        script: 'yarn workspace @splice/mock-oauth2 start',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'extension',
        script: 'yarn workspace @splice/clients-extension dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'example',
        script: 'yarn workspace @splice/example dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'splice-wallet-sdk',
        script: 'yarn workspace @splice/wallet-sdk dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'core-ledger-client',
        script: 'yarn workspace @splice/core-ledger-client dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'core-splice-provider',
        script: 'yarn workspace @splice/core-splice-provider dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'core-wallet-auth',
        script: 'yarn workspace @splice/core-wallet-auth dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'core-wallet-ui-components',
        script: 'yarn workspace @splice/core-wallet-ui-components build:watch',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'core-wallet-store',
        script: 'yarn workspace @splice/core-wallet-store dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'core-wallet-user-rpc-client',
        script: 'yarn workspace @splice/core-wallet-user-rpc-client dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'core-wallet-dapp-rpc-client',
        script: 'yarn workspace @splice/core-wallet-dapp-rpc-client dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'core-types',
        script: 'yarn workspace @splice/core-types dev',
        env_development: sharedEnvDevelopment,
    },
]
