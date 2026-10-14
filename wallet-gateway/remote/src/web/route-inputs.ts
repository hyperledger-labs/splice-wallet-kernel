// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { resolve } from 'node:path'

export const ROUTE_INPUTS: Record<string, string> = {
    main: 'index.html',
    404: '404/index.html',
    approve: 'approve/index.html',
    callback: 'callback/index.html',
    login: 'login/index.html',
    selfIssuedLogin: 'self-issued-login/index.html',
    parties: 'parties/index.html',
    addParty: 'parties/add/index.html',
    editParty: 'parties/edit/index.html',
    activities: 'activities/index.html',
    networks: 'networks/index.html',
    addNetwork: 'networks/add/index.html',
    reviewNetwork: 'networks/review/index.html',
    identityProviders: 'identity-providers/index.html',
    addIdentityProvider: 'identity-providers/add/index.html',
    reviewIdentityProvider: 'identity-providers/review/index.html',
    apiKeys: 'api-keys/index.html',
    addApiKey: 'api-keys/add/index.html',
    signMessage: 'sign-message/index.html',
}

export function resolveRouteInputs(
    frontendRoot: string
): Record<string, string> {
    return Object.fromEntries(
        Object.entries(ROUTE_INPUTS).map(([name, htmlPath]) => [
            name,
            resolve(frontendRoot, htmlPath),
        ])
    )
}
