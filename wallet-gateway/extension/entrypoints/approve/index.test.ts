// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { SigningProvider } from '@canton-network/core-signing-lib'
import { PartyLevelRight } from '@canton-network/core-wallet-store'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const request = vi.fn()

vi.mock('@canton-network/core-wallet-ui-components', async () => {
    const { LitElement } = await import('lit')
    return { BaseElement: LitElement, handleErrorToast: vi.fn() }
})
vi.mock('@canton-network/core-tx-visualizer', () => ({
    parsePreparedTransaction: vi.fn().mockReturnValue({}),
}))
vi.mock('@/utils/legacy-frontend', () => ({}))
vi.mock('@/utils/legacy-frontend/listeners.js', () => ({
    detectCurrentOrigin: vi.fn().mockResolvedValue('https://dapp.example'),
}))
vi.mock('@/utils/legacy-frontend/state-manager', () => ({
    stateManager: {
        accessToken: { get: vi.fn().mockResolvedValue('token-1') },
    },
}))
vi.mock('@/utils/legacy-frontend/rpc-client', () => ({
    createUserClient: vi.fn(async () => ({ request })),
}))
vi.mock('@/utils/legacy-frontend/navigation.js', () => ({
    setLocationHref: vi.fn(),
}))
vi.mock('@/utils/legacy-frontend/utils', () => ({ showToast: vi.fn() }))

const { ApproveUi } = await import('./index')

const transactionId = 'tx-1'
const partyId = 'party::namespace'

describe('ApproveUi', () => {
    beforeEach(() => {
        vi.stubGlobal('window', { setTimeout: vi.fn() })
        request.mockReset()
        request.mockImplementation(async ({ method }: { method: string }) => {
            switch (method) {
                case 'getTransaction':
                    return {
                        id: transactionId,
                        commandId: 'cmd-1',
                        status: 'pending',
                        preparedTransaction: 'prepared-tx',
                        preparedTransactionHash: 'tx-hash',
                        payload: '',
                    }
                case 'listWallets':
                    return [
                        {
                            partyId,
                            primary: true,
                            signingProviderId: SigningProvider.WALLET_KERNEL,
                            rights: [PartyLevelRight.CanActAs],
                        },
                    ]
                case 'sign':
                    return {
                        status: 'signed',
                        signature: 'signature',
                        signedBy: 'namespace',
                        partyId,
                        externalTxId: 'external-tx-1',
                    }
                case 'execute':
                    return { updateId: 'update-1', completionOffset: 1 }
                default:
                    throw new Error(`Unexpected request ${method}`)
            }
        })
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('executes a signed transaction with only the execution parameters', async () => {
        const approval = new ApproveUi()
        approval.transactionId = transactionId
        await approval['updateState']()

        await approval['handleApprove']()

        const calls = request.mock.calls.map(([payload]) => payload)
        expect(calls.filter(({ method }) => method !== 'listWallets')).toEqual([
            { method: 'getTransaction', params: { transactionId } },
            { method: 'sign', params: { transactionId, partyId } },
            { method: 'execute', params: { transactionId, partyId } },
        ])
    })
})
