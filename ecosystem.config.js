// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

const sharedEnvDevelopment = {
    NODE_ENV: 'development',
    DEBUG: 'true',
}

export const apps = [
    {
        name: 'remote',
        script: 'yarn workspace @canton-network/wallet-gateway-remote dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'mock-oauth2-server',
        script: 'yarn workspace @canton-network/mock-oauth2 start',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'extension',
        script: 'yarn workspace @canton-network/wallet-gateway-extension dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'example',
        script: 'yarn workspace @canton-network/example dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'splice-wallet-sdk',
        script: 'yarn workspace @canton-network/wallet-sdk dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'core-ledger-client',
        script: 'yarn workspace @canton-network/core-ledger-client dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'core-splice-provider',
        script: 'yarn workspace @canton-network/core-splice-provider dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'core-wallet-auth',
        script: 'yarn workspace @canton-network/core-wallet-auth dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'core-wallet-ui-components',
        script: 'yarn workspace @canton-network/core-wallet-ui-components build:watch',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'core-wallet-store',
        script: 'yarn workspace @canton-network/core-wallet-store dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'core-wallet-user-rpc-client',
        script: 'yarn workspace @canton-network/core-wallet-user-rpc-client dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'core-wallet-dapp-rpc-client',
        script: 'yarn workspace @canton-network/core-wallet-dapp-rpc-client dev',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'core-types',
        script: 'yarn workspace @canton-network/core-types dev',
        env_development: sharedEnvDevelopment,
    },
]
