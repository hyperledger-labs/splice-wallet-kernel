// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { rpcErrors } from '@canton-network/core-rpc-errors'
import type { Methods } from './rpc-gen'

/**
 * Methods the extension doesn't implement: self-issued login and
 * signing-provider keys are deferred, API keys are remote-only.
 */
export const unsupported = (): Pick<
    Methods,
    | 'startSelfIssuedLoginSession'
    | 'getSelfIssuedLoginMode'
    | 'createSelfIssuedWallet'
    | 'allocateSelfIssuedWallet'
    | 'completeSelfIssuedLogin'
    | 'removeSelfIssuedLoginSession'
    | 'generateApiKey'
    | 'listApiKeys'
    | 'removeApiKey'
    | 'listSigningProviderKeys'
    | 'changeSigningProvider'
> => ({
    startSelfIssuedLoginSession: async () => {
        throw new Error('Function startSelfIssuedLoginSession not implemented.')
    },
    getSelfIssuedLoginMode: async () => {
        throw new Error('Function getSelfIssuedLoginMode not implemented.')
    },
    createSelfIssuedWallet: async () => {
        throw new Error('Function createSelfIssuedWallet not implemented.')
    },
    allocateSelfIssuedWallet: async () => {
        throw new Error('Function allocateSelfIssuedWallet not implemented.')
    },
    completeSelfIssuedLogin: async () => {
        throw new Error('Function completeSelfIssuedLogin not implemented.')
    },
    removeSelfIssuedLoginSession: async () => {
        throw new Error(
            'Function removeSelfIssuedLoginSession not implemented.'
        )
    },
    generateApiKey: async () => {
        throw rpcErrors.methodNotSupported()
    },
    listApiKeys: async () => {
        throw rpcErrors.methodNotSupported()
    },
    removeApiKey: async () => {
        throw rpcErrors.methodNotSupported()
    },
    listSigningProviderKeys: async () => {
        throw new Error('Function listSigningProviderKeys not implemented.')
    },
    changeSigningProvider: async () => {
        throw new Error('Function changeSigningProvider not implemented.')
    },
})
