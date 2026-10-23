// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

const sharedEnvDevelopment = {
    NODE_ENV: 'development',
    DEBUG: 'true',
}

export const apps = [
    {
        name: 'remote',
        script: 'pnpm nx run @canton-network/wallet-gateway-remote:dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'mock-oauth2-server',
        script: 'pnpm --filter @canton-network/mock-oauth2 dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'example-ping',
        script: 'pnpm --filter @canton-network/example-ping dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'example-porfolio',
        script: 'pnpm --filter @canton-network/example-portfolio dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'wallet-sdk',
        script: 'pnpm --filter @canton-network/wallet-sdk dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'dapp-sdk',
        script: 'pnpm --filter @canton-network/dapp-sdk dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'core-ledger-client',
        script: 'pnpm --filter @canton-network/core-ledger-client dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'core-splice-provider',
        script: 'pnpm --filter @canton-network/core-splice-provider dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'core-wallet-auth',
        script: 'pnpm --filter @canton-network/core-wallet-auth dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'core-wallet-ui-components',
        script: 'pnpm --filter @canton-network/core-wallet-ui-components build:watch',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'core-wallet-ui-components-sb-lit',
        script: 'pnpm --filter @canton-network/core-wallet-ui-components dev:lit',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'core-wallet-ui-components-sb',
        script: 'pnpm --filter @canton-network/core-wallet-ui-components dev',
        env_development: sharedEnvDevelopment,
    },

    {
        name: 'core-wallet-services',
        script: 'pnpm --filter @canton-network/core-wallet-services dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'core-wallet-store',
        script: 'pnpm --filter @canton-network/core-wallet-store dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'core-wallet-user-rpc-client',
        script: 'pnpm --filter @canton-network/core-wallet-user-rpc-client dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'core-wallet-dapp-rpc-client',
        script: 'pnpm --filter @canton-network/core-wallet-dapp-rpc-client dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'core-types',
        script: 'pnpm --filter @canton-network/core-types dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'core-rpc-transport',
        script: 'pnpm --filter @canton-network/core-rpc-transport dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'core-wallet-test-utils',
        script: 'pnpm --filter @canton-network/core-wallet-test-utils dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'core-tx-parser',
        script: 'pnpm --filter @canton-network/core-tx-parser dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'core-token-standard-service',
        script: 'pnpm --filter @canton-network/core-token-standard-service dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'core-ledger-client-types',
        script: 'pnpm --filter @canton-network/core-ledger-client-types dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'core-amulet-service',
        script: 'pnpm --filter @canton-network/core-amulet-service dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'core-asyncapi-client',
        script: 'pnpm --filter @canton-network/core-asyncapi-client dev',
        env_development: sharedEnvDevelopment,
    },
]
