// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fixture, waitUntil } from '@open-wc/testing-helpers'
import { html } from 'lit'
import { PartyLevelRight } from '@canton-network/core-wallet-store'
import {
    TransactionApproveEvent,
    TransactionDeleteEvent,
} from '@canton-network/core-wallet-ui-components'
import {
    createMockUserClient,
    makeTransaction,
    makeWallet,
    mockRequest,
} from '../test-helpers.js'

const {
    mockCreateUserClient,
    showToast,
    handleErrorToast,
    setLocationHref,
    parsePreparedTransaction,
    detectCurrentOrigin,
} = vi.hoisted(() => ({
    mockCreateUserClient: vi.fn(),
    showToast: vi.fn(),
    handleErrorToast: vi.fn(),
    setLocationHref: vi.fn(),
    parsePreparedTransaction: vi.fn(() => ({ summary: 'parsed' })),
    detectCurrentOrigin: vi.fn().mockResolvedValue('http://localhost'),
}))

vi.mock('../index.js', () => ({}))
vi.mock('../navigation.js', () => ({ setLocationHref }))
vi.mock('../listeners.js', () => ({ detectCurrentOrigin }))
vi.mock('../rpc-client.js', () => ({
    createUserClient: mockCreateUserClient,
}))
vi.mock('../state-manager.js', () => ({
    stateManager: {
        accessToken: { get: () => 'test-token' },
        currentOrigin: {
            get: vi.fn().mockReturnValue('http://localhost'),
            set: vi.fn(),
            clear: vi.fn(),
        },
    },
}))
vi.mock('../utils.js', () => ({ showToast }))
vi.mock('@canton-network/core-tx-visualizer', () => ({
    parsePreparedTransaction,
}))
vi.mock('@canton-network/core-wallet-ui-components', async (importOriginal) => {
    const actual =
        await importOriginal<
            typeof import('@canton-network/core-wallet-ui-components')
        >()
    return {
        ...actual,
        handleErrorToast,
    }
})

import './index.js'
import type { ApproveUi } from './index.js'

function mockApproveState(
    transaction = makeTransaction(),
    wallet = makeWallet({
        primary: true,
        partyId: 'party::ns',
        rights: [PartyLevelRight.CanActAs],
    })
) {
    mockRequest.mockImplementation(async ({ method }) => {
        if (method === 'getTransaction') {
            return transaction
        }
        if (method === 'listWallets') {
            return [wallet]
        }
        if (method === 'sign') {
            return {
                status: 'signed',
                signature: 'sig',
                signedBy: 'key',
                partyId: wallet.partyId,
            }
        }
        if (method === 'execute') {
            return {}
        }
        if (method === 'deleteTransaction') {
            return undefined
        }
        return undefined
    })
}

describe('UserUiApprove', () => {
    let el: ApproveUi
    const componentFixture = html`<user-ui-approve></user-ui-approve>`

    beforeEach(() => {
        mockCreateUserClient.mockReset()
        mockRequest.mockReset()
        showToast.mockReset()
        handleErrorToast.mockReset()
        setLocationHref.mockReset()
        detectCurrentOrigin.mockClear()
        parsePreparedTransaction.mockClear()
        mockCreateUserClient.mockResolvedValue(createMockUserClient())
        vi.stubGlobal(
            'confirm',
            vi.fn(() => true)
        )
        history.replaceState({}, '', '?transactionId=tx-1')
    })

    afterEach(() => {
        document.body.innerHTML = ''
        vi.unstubAllGlobals()
        vi.useRealTimers()
    })

    describe('with default approve state', () => {
        beforeEach(async () => {
            mockApproveState()
            el = await fixture<ApproveUi>(componentFixture)
            await waitUntil(
                () => el.commandId === 'cmd-1',
                'transaction loaded'
            )
        })

        it('loads transaction details from the URL and renders the detail view', () => {
            expect(el.transactionId).toBe('tx-1')
            expect(el.txHash).toBe('hash-abc')
            expect(parsePreparedTransaction).toHaveBeenCalledWith(
                'prepared-tx-blob'
            )
            expect(
                el.shadowRoot?.querySelector('wg-transaction-detail')
            ).not.toBeNull()
        })

        it('redirects to activities after approve when closeafteraction is not set', async () => {
            const closeSpy = vi
                .spyOn(window, 'close')
                .mockImplementation(() => {})

            el.shadowRoot
                ?.querySelector('wg-transaction-detail')
                ?.dispatchEvent(new TransactionApproveEvent('cmd-1'))

            await waitUntil(() =>
                mockRequest.mock.calls.some((c) => c[0]?.method === 'execute')
            )
            await waitUntil(
                () => setLocationHref.mock.calls.length > 0,
                'redirect after approve',
                { timeout: 3000 }
            )

            expect(showToast).toHaveBeenCalledWith(
                '',
                'Activity executed successfully',
                'success'
            )
            expect(closeSpy).not.toHaveBeenCalled()
            expect(setLocationHref).toHaveBeenCalledWith(
                expect.stringContaining('/activities')
            )
            expect(el.disabled).toBe(true)
            closeSpy.mockRestore()
        })

        it('deletes transaction when reject is confirmed', async () => {
            el.shadowRoot
                ?.querySelector('wg-transaction-detail')
                ?.dispatchEvent(new TransactionDeleteEvent('cmd-1'))

            await waitUntil(() =>
                mockRequest.mock.calls.some(
                    (c) => c[0]?.method === 'deleteTransaction'
                )
            )
            await waitUntil(
                () => setLocationHref.mock.calls.length > 0,
                'redirect after reject',
                { timeout: 3000 }
            )

            expect(mockRequest).toHaveBeenCalledWith(
                expect.objectContaining({ method: 'deleteTransaction' })
            )
            expect(showToast).toHaveBeenCalledWith(
                '',
                'Activity rejected successfully',
                'success'
            )
            expect(setLocationHref).toHaveBeenCalledWith(
                expect.stringContaining('/activities')
            )
        })
    })

    describe('with closeafteraction in the URL', () => {
        beforeEach(async () => {
            history.replaceState({}, '', '?transactionId=tx-1&closeafteraction')
            mockApproveState()
            el = await fixture<ApproveUi>(componentFixture)
            await waitUntil(() => el.commandId === 'cmd-1')
        })

        it('closes the window after approve when opened from a dApp', async () => {
            setLocationHref.mockClear()
            const openerGet = vi
                .spyOn(window, 'opener', 'get')
                .mockReturnValue({} as Window)
            const closeSpy = vi
                .spyOn(window, 'close')
                .mockImplementation(() => {})

            el.shadowRoot
                ?.querySelector('wg-transaction-detail')
                ?.dispatchEvent(new TransactionApproveEvent('cmd-1'))

            await waitUntil(() =>
                mockRequest.mock.calls.some((c) => c[0]?.method === 'execute')
            )
            await waitUntil(
                () => closeSpy.mock.calls.length > 0,
                'close popup after approve',
                { timeout: 3000 }
            )

            openerGet.mockRestore()
            closeSpy.mockRestore()

            expect(setLocationHref).not.toHaveBeenCalled()
            expect(el.disabled).toBe(true)
        })
    })

    describe('with read-only wallet', () => {
        beforeEach(async () => {
            mockApproveState(
                makeTransaction(),
                makeWallet({
                    primary: true,
                    rights: [PartyLevelRight.CanReadAs],
                })
            )
            el = await fixture<ApproveUi>(componentFixture)
            await waitUntil(() => el.canSubmit === false)
        })

        it('shows read-only warning when primary wallet cannot submit', () => {
            expect(el.walletCapabilityMessage).toContain('read-only')
            expect(
                el.shadowRoot?.querySelector('.alert-warning')
            ).not.toBeNull()
        })

        it('does not sign when wallet is read-only', async () => {
            el.shadowRoot
                ?.querySelector('wg-transaction-detail')
                ?.dispatchEvent(new TransactionApproveEvent('cmd-1'))

            await waitUntil(() => showToast.mock.calls.length > 0)

            expect(mockRequest).not.toHaveBeenCalledWith(
                expect.objectContaining({ method: 'sign' })
            )
            expect(showToast).toHaveBeenCalledWith(
                'Read-only wallet',
                expect.any(String),
                'error'
            )
        })
    })

    it('starts polling when sign returns pending', async () => {
        // vi.useFakeTimers()
        let txStatus = 'pending'

        // mockApproveState()
        mockRequest.mockImplementation(async ({ method }) => {
            if (method === 'getTransaction') {
                return makeTransaction({
                    status: txStatus,
                    ...(txStatus !== 'pending' && { externalTxId: 'ext-1' }),
                })
            }
            if (method === 'listWallets') {
                return [
                    makeWallet({
                        primary: true,
                        rights: [PartyLevelRight.CanActAs],
                        partyId: 'alice::1220abc',
                    }),
                ]
            }
            if (method === 'sign') {
                txStatus = 'awaiting-signature'
                return {
                    status: txStatus,
                    partyId: 'alice::1220abc',
                    externalTxId: 'ext-1',
                }
            }
            if (method === 'getTransactionStatus') {
                return { status: 'awaiting-signature', externalTxId: 'ext-1' }
            }
            return undefined
        })

        const element = document.createElement('user-ui-approve') as ApproveUi
        element.pollIntervalMs = 10
        document.body.appendChild(element)
        el = element

        await waitUntil(() => el.commandId === 'cmd-1')

        el.shadowRoot
            ?.querySelector('wg-transaction-detail')
            ?.dispatchEvent(new TransactionApproveEvent('cmd-1'))

        await waitUntil(() => el.status === 'awaiting-signature')

        await waitUntil(
            () =>
                mockRequest.mock.calls.some(
                    (c) => c[0]?.method === 'getTransactionStatus'
                ),
            'poll fired'
        )
        expect(mockRequest).toHaveBeenCalledWith(
            expect.objectContaining({
                method: 'getTransactionStatus',
                params: expect.objectContaining({ partyId: 'alice::1220abc' }),
            })
        )
    })

    it('does not delete when reject confirmation is cancelled', async () => {
        vi.stubGlobal(
            'confirm',
            vi.fn(() => false)
        )
        mockApproveState()
        el = await fixture<ApproveUi>(componentFixture)
        await waitUntil(() => el.commandId === 'cmd-1')

        el.shadowRoot
            ?.querySelector('wg-transaction-detail')
            ?.dispatchEvent(new TransactionDeleteEvent('cmd-1'))

        await new Promise((r) => setTimeout(r, 50))

        expect(mockRequest).not.toHaveBeenCalledWith(
            expect.objectContaining({ method: 'deleteTransaction' })
        )
    })

    describe('failure reasons and error handling', () => {
        it('renders an alert warning when a failure reason exists', async () => {
            const txWithFailure = makeTransaction({
                failureReason: 'Insufficient funds or ledger rejection',
            })
            mockApproveState(txWithFailure)
            el = await fixture<ApproveUi>(componentFixture)
            await waitUntil(() => el.commandId === 'cmd-1')

            const warnings = el.shadowRoot?.querySelectorAll('.alert-warning')
            const hasFailureText = Array.from(warnings || []).some((node) =>
                node.textContent?.includes('Insufficient funds')
            )
            expect(hasFailureText).toBe(true)
        })

        it('refreshes state after a failed execute', async () => {
            let txStatus = 'signed'

            mockRequest.mockImplementation(async ({ method }) => {
                if (method === 'getTransaction') {
                    return makeTransaction({
                        status: txStatus,
                        ...(txStatus === 'failed' && {
                            failureReason: 'Ledger rejected submission',
                        }),
                    })
                }

                if (method === 'listWallets') {
                    return [
                        makeWallet({
                            primary: true,
                            partyId: 'alice::abc',
                            rights: [PartyLevelRight.CanActAs],
                        }),
                    ]
                }

                if (method === 'execute') {
                    txStatus = 'failed'
                    throw new Error('Ledger rejected submission')
                }

                return undefined
            })

            el = await fixture<ApproveUi>(componentFixture)
            await waitUntil(() => el.commandId === 'cmd-1')
            expect(el.status).toBe('signed')

            el.shadowRoot
                ?.querySelector('wg-transaction-detail')
                ?.dispatchEvent(new TransactionApproveEvent('cmd-1'))

            await waitUntil(
                () => el.status === 'failed',
                'state refreshed after failure'
            )

            expect(handleErrorToast).toHaveBeenCalled()
            expect(el.failureReason).toContain('Ledger rejected')
            expect(setLocationHref).not.toHaveBeenCalled()

            expect(mockRequest).not.toHaveBeenCalledWith(
                expect.objectContaining({ method: 'sign' })
            )
        })
    })

    describe('visibility change polling synchronization', () => {
        let hidden = false
        beforeEach(() => {
            hidden = false
            Object.defineProperty(document, 'hidden', {
                configurable: true,
                get: () => hidden,
            })
        })

        afterEach(
            () => delete (document as unknown as { hidden?: boolean }).hidden
        )

        it('pauses polling while doc is hidden and resumes when visible', async () => {
            mockRequest.mockImplementation(async ({ method }) => {
                if (method === 'getTransaction') {
                    return makeTransaction({
                        status: 'awaiting-signature',
                        externalTxId: 'ext-1',
                    })
                }

                if (method === 'listWallets') {
                    return [
                        makeWallet({
                            primary: true,
                            partyId: 'alice::abc',
                            rights: [PartyLevelRight.CanActAs],
                        }),
                    ]
                }

                if (method === 'getTransactionStatus') {
                    return {
                        status: 'awaiting-signature',
                        externalTxId: 'ext-1',
                    }
                }

                return undefined
            })

            const element = document.createElement(
                'user-ui-approve'
            ) as ApproveUi
            element.pollIntervalMs = 10
            document.body.appendChild(element)
            el = element

            await waitUntil(() => el.commandId === 'cmd-1')

            const pollCount = () =>
                mockRequest.mock.calls.filter(
                    (c) => c[0]?.method === 'getTransactionStatus'
                ).length

            await waitUntil(() => pollCount() > 0, 'poll started')

            hidden = true
            document.dispatchEvent(new Event('visibilitychange'))

            await new Promise((r) => setTimeout(r, 30))
            const whileHidden = pollCount()

            await new Promise((r) => setTimeout(r, 60))
            expect(pollCount()).toBe(whileHidden)

            hidden = false
            document.dispatchEvent(new Event('visibilitychange'))

            await waitUntil(() => pollCount() > whileHidden, 'poll resumed')
        })
    })
})
