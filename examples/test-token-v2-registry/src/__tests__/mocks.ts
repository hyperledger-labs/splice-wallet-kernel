// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { NextFunction, Request, Response } from 'express'
import type { TExpressOpenApiRequestHandler } from 'openapi-ts-router/express'
import { vi, type Mock } from 'vitest'

const execute: Mock = vi.fn().mockResolvedValue({
    completionOffset: 100,
})
const sign: Mock = vi.fn().mockReturnValue({ execute })
const prepare: Mock = vi.fn().mockReturnValue({ sign })
const create: Mock = vi.fn().mockReturnValue({ sign })

const readJsContracts: Mock = vi.fn()
const generate: Mock = vi.fn().mockReturnValue({
    publicKey: 'test-public-key',
    privateKey: 'test-private-key',
})
const rules: Mock = vi.fn()

const sdk = {
    ledger: {
        acsReader: {
            readJsContracts,
        },
        prepare,
    },
    keys: {
        generate,
    },
    testToken: {
        create: {
            rules,
        },
    },
    party: {
        external: {
            create,
        },
    },
}

const instantiate: Mock = vi.fn().mockImplementation(() => {
    state.RegistryState.instance = {
        reset,
        port: 5634,
        synchronizerId: 'sync',
        operator: {
            party: 'some-party',
            keys: {
                publicKey: 'publicKey',
                privateKey: 'privateKey',
            },
        },
        sdk,
    }
})
const reset: Mock = vi.fn().mockImplementation(() => {
    state.RegistryState.instance = {
        reset,
        port: 5634,
        synchronizerId: '',
        operator: {
            party: '',
            keys: {
                publicKey: '',
                privateKey: '',
            },
        },
        sdk,
    }
})

const state = {
    RegistryState: {
        instantiate,
        instance: {
            reset,
            port: 5635,
            synchronizerId: '',
            operator: {
                party: '',
                keys: {
                    publicKey: '',
                    privateKey: '',
                },
            },
            sdk,
        },
    },
    defaultConfig: {},
}

const req = {
    params: {},
    query: {},
    body: undefined,
    headers: {},
} as unknown as Request
const res = {
    json: vi.fn(),
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
} as unknown as Response
const next = vi.fn() as unknown as NextFunction

export const expressContext: {
    req: Request
    res: Response
    next: NextFunction
} = { req, res, next }

export const mock = {
    sdk,
    prepare,
    sign,
    execute,
    create,
    state,
}

export type RequestType<
    APIHandler extends TExpressOpenApiRequestHandler<unknown>,
> = Parameters<APIHandler>[0]
