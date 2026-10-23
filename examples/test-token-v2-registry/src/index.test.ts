// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest'
import { mock } from './__tests__/mocks'
import { stopRegistry } from '.'

const mocks = vi.hoisted(() => {
    const use = vi.fn().mockReturnThis()
    const close = vi.fn()
    const listen = vi.fn().mockReturnValue({
        close,
    })
    const json = vi.fn()

    const expressFactory = vi.fn(() => ({
        use,
        listen,
    }))

    const vetDar = vi.fn()

    return {
        use,
        close,
        listen,
        json,
        expressFactory,
        vetDar,
    }
})

vi.mock('./common/state', async () => {
    const { mock: importedMock } = await import('./__tests__/mocks')

    return importedMock.state
})

vi.mock('express', () => {
    const defaultFn = () => mocks.expressFactory()
    defaultFn.json = mocks.json
    return {
        default: defaultFn,
    }
})

vi.mock('./api/metadata/index.js', () => ({
    default: 'metadataRouter',
}))

vi.mock('./api/transfer-instruction/index.js', () => ({
    default: 'transferInstructionRouter',
}))

vi.mock('./api/allocation/index.js', () => ({
    default: 'allocationRouter',
}))

vi.mock('./api/allocation-instruction/index.js', () => ({
    default: 'allocationInstructionRouter',
}))

vi.mock('./api/utilities/index.js', () => ({
    default: 'utilitiesRouter',
}))

vi.mock('@canton-network/core-splice-codegen', () => ({
    TestTokenV2: {
        utils: {
            vetDar: mocks.vetDar,
        },
    },
}))

vi.mock('./common/defaultSdk', () => ({
    default: {},
}))

describe('entry file', () => {
    it("shouldn't do anything when stopRegistry is called without startRegistry", async () => {
        stopRegistry()
        expect(mock.state.RegistryState.instance.reset).not.toHaveBeenCalled()
        expect(mocks.close).not.toHaveBeenCalled()
    })

    it('should initialize the app and start listening', async () => {
        const { startRegistry } = await import('.')

        await startRegistry({
            port: 1111,
        })

        expect(mock.state.RegistryState.instantiate).toHaveBeenCalledOnce()
        expect(mock.state.RegistryState.instantiate).toHaveBeenCalledWith({
            port: 1111,
        })

        expect(mocks.json).toHaveBeenCalledOnce()
        expect(mocks.use).toHaveBeenCalledTimes(8)
        expect(mocks.listen).toHaveBeenCalledOnce()
        expect(mocks.listen).toHaveBeenCalledWith(5634, expect.any(Function))
        expect(mocks.vetDar).not.toHaveBeenCalled()
    })

    it('should properly close the server', async () => {
        const { startRegistry, stopRegistry } = await import('.')

        await startRegistry()

        expect(mocks.close).not.toHaveBeenCalled()

        stopRegistry()

        expect(mock.state.RegistryState.instance.reset).toHaveBeenCalledOnce()
        expect(mocks.close).toHaveBeenCalledOnce()
    })

    it('should pass empty config when no config is provided', async () => {
        const { startRegistry } = await import('.')

        await startRegistry()

        expect(mock.state.RegistryState.instantiate).toHaveBeenCalledWith({})
    })

    it('should setup middleware in correct order', async () => {
        const { startRegistry } = await import('.')

        await startRegistry()

        const routerCallOrder = mocks.use.mock.calls
            .map((call) => call[0])
            .filter((arg): arg is string => typeof arg === 'string')
        expect(routerCallOrder).toEqual([
            'metadataRouter',
            'transferInstructionRouter',
            'allocationRouter',
            'allocationInstructionRouter',
            'utilitiesRouter',
        ])
        expect(typeof mocks.use.mock.calls.at(-1)?.[0]).toBe('function')
    })
})
