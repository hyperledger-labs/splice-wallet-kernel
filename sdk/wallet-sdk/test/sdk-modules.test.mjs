// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import test from 'node:test'
import assert from 'node:assert/strict'

import { SDK } from '../dist/index.js'

function fakeProvider() {
    return {
        async request(operation) {
            if (operation?.params?.resource === '/v2/authenticated-user') {
                return { user: { id: 'module-test-user' } }
            }

            if (
                operation?.params?.resource ===
                '/v2/state/connected-synchronizers'
            ) {
                return {
                    connectedSynchronizers: [{ synchronizerId: 'sync-1' }],
                }
            }

            throw new Error(
                `Unexpected ledger request in module test: ${operation?.params?.resource}`
            )
        },
    }
}

test('initializes modules in dependency order', async () => {
    const creationOrder = []

    const sdk = await SDK.create(fakeProvider(), {
        modules: {
            alpha: {
                create: async () => {
                    creationOrder.push('alpha')
                    return { value: 1 }
                },
            },
            beta: {
                dependsOn: ['alpha'],
                create: async () => {
                    creationOrder.push('beta')
                    return { value: 2 }
                },
            },
        },
    })

    assert.deepEqual(creationOrder, ['alpha', 'beta'])
    assert.equal(sdk.alpha.value, 1)
    assert.equal(sdk.beta.value, 2)
})

test('throws for missing hard dependency', async () => {
    await assert.rejects(
        SDK.create(fakeProvider(), {
            modules: {
                beta: {
                    dependsOn: ['alpha'],
                    create: async () => ({ ok: true }),
                },
            },
        }),
        /depends on missing module 'alpha'/
    )
})

test('throws for cyclic dependencies', async () => {
    await assert.rejects(
        SDK.create(fakeProvider(), {
            modules: {
                alpha: {
                    dependsOn: ['beta'],
                    create: async () => ({ ok: true }),
                },
                beta: {
                    dependsOn: ['alpha'],
                    create: async () => ({ ok: true }),
                },
            },
        }),
        /Detected cyclic SDK module dependency/
    )
})

test('passes moduleConfig and runs validateConfig', async () => {
    const sdk = await SDK.create(fakeProvider(), {
        modules: {
            configurable: {
                validateConfig: (config) => {
                    if (!config || config.enabled !== true) {
                        throw new Error('enabled must be true')
                    }
                },
                create: async (_sdk, config) => ({ enabled: config.enabled }),
            },
        },
        moduleConfig: {
            configurable: { enabled: true },
        },
    })

    assert.equal(sdk.configurable.enabled, true)

    await assert.rejects(
        SDK.create(fakeProvider(), {
            modules: {
                configurable: {
                    validateConfig: (config) => {
                        if (!config || config.enabled !== true) {
                            throw new Error('enabled must be true')
                        }
                    },
                    create: async () => ({}),
                },
            },
            moduleConfig: {
                configurable: { enabled: false },
            },
        }),
        /enabled must be true/
    )
})

test('supports cross-module lookup via has/get/require', async () => {
    const sdk = await SDK.create(fakeProvider(), {
        modules: {
            alpha: {
                create: async () => ({ value: 42 }),
            },
            beta: {
                dependsOn: ['alpha'],
                create: async (_sdk, _config, modules) => ({
                    hasAlpha: modules.hasModule('alpha'),
                    alphaValue: modules.requireModule('alpha').value,
                    missing: modules.getModule('missing'),
                }),
            },
        },
    })

    assert.equal(sdk.beta.hasAlpha, true)
    assert.equal(sdk.beta.alphaValue, 42)
    assert.equal(sdk.beta.missing, undefined)
})

test('optional dependencies do not fail when absent', async () => {
    const sdk = await SDK.create(fakeProvider(), {
        modules: {
            beta: {
                optionalDependsOn: ['alpha'],
                create: async (_sdk, _config, modules) => ({
                    hasAlpha: modules.hasModule('alpha'),
                }),
            },
        },
    })

    assert.equal(sdk.beta.hasAlpha, false)
})
