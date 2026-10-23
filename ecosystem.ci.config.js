// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

const sharedEnvDevelopment = {
    NODE_ENV: 'development',
    DEBUG: 'true',
}

export const apps = [
    {
        name: 'remote',
        script: 'pnpm nx run @canton-network/wallet-gateway-remote:start',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'mock-oauth2-server',
        script: 'pnpm --filter @canton-network/mock-oauth2 start',
        env_development: sharedEnvDevelopment,
    },
    {
        name: 'example-ping',
        script: 'pnpm --filter @canton-network/example-ping preview',
        env_development: sharedEnvDevelopment,
    },
    {
        // Serves the production build, not the Vite dev server. In dev the
        // browser loads hundreds of unbundled modules that Vite transforms on
        // demand, which slows down every page the e2e tests open (~19% of the
        // suite). The build comes from the CI build job.
        name: 'example-portfolio',
        script: 'pnpm --filter @canton-network/example-portfolio preview',
        env_development: sharedEnvDevelopment,
    },
]
