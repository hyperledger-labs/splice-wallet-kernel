// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
    type Mock,
} from 'vitest'
import type { EventListener } from '@canton-network/core-splice-provider'
import type { DappAsyncProvider } from '@canton-network/core-provider-dapp'
import type {
    LedgerApiParams,
    PrepareExecuteParams,
    SignMessageParams,
} from './dapp-api/rpc-gen/typings'
import { errorCodes, JsonRpcError } from '@canton-network/core-rpc-errors'
import { dappSDKController } from './sdk-controller'

const { popupOpen } = vi.hoisted(() => ({
    popupOpen: vi.fn(),
}))

vi.mock('@canton-network/core-wallet-ui-components', () => ({
    popup: {
        open: popupOpen,
    },
}))

type MockDappAsyncProvider = {
    request: Mock<DappAsyncProvider['request']>
    on: Mock<DappAsyncProvider['on']>
    removeListener: Mock<DappAsyncProvider['removeListener']>
    emit: (event: string, ...payload: unknown[]) => void
}

const makeProvider = (): MockDappAsyncProvider => {
    const listeners = new Map<string, EventListener<unknown>[]>()

    const mock: MockDappAsyncProvider = {
        request: vi.fn(),
        on: vi.fn<DappAsyncProvider['on']>(),
        removeListener: vi.fn<DappAsyncProvider['removeListener']>(),
        // Test helper only - real DappAsyncProvider emits via AbstractProvider/SSE.
        emit(event: string, ...payload: unknown[]) {
            for (const listener of listeners.get(event) ?? []) {
                listener(...payload)
            }
        },
    }

    mock.on.mockImplementation((event, listener) => {
        const current = listeners.get(event) ?? []
        current.push(listener)
        listeners.set(event, current)
        // Provider.on returns the provider for chaining, like the real implementation.
        return asProvider(mock)
    })

    mock.removeListener.mockImplementation((event, listener) => {
        listeners.set(
            event,
            (listeners.get(event) ?? []).filter((fn) => fn !== listener)
        )
        return asProvider(mock)
    })

    return mock
}

const asProvider = (mock: MockDappAsyncProvider): DappAsyncProvider =>
    mock as unknown as DappAsyncProvider

const prepareExecuteParams: PrepareExecuteParams = { commands: [] }
const signMessageParams: SignMessageParams = { message: 'hello' }
const ledgerApiParams: LedgerApiParams = {
    requestMethod: 'get',
    resource: '/v2/state/active-contracts',
}

describe('dappSDKController', () => {
    beforeEach(() => {
        popupOpen.mockReset()
        vi.spyOn(crypto, 'randomUUID').mockReturnValue(
            '00000000-0000-4000-8000-000000000001'
        )
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('delegates simple RPC methods to the provider', async () => {
        const mock = makeProvider()
        const controller = dappSDKController(asProvider(mock))

        mock.request.mockResolvedValueOnce(null)
        await expect(controller.disconnect()).resolves.toBeNull()

        mock.request.mockResolvedValueOnce({ isConnected: false })
        await expect(controller.isConnected()).resolves.toEqual({
            isConnected: false,
        })

        mock.request.mockResolvedValueOnce({
            connection: { isConnected: true },
        })
        await expect(controller.status()).resolves.toEqual({
            connection: { isConnected: true },
        })

        mock.request.mockResolvedValueOnce({ accounts: [] })
        await expect(controller.listAccounts()).resolves.toEqual({
            accounts: [],
        })

        mock.request.mockResolvedValueOnce({ network: 'mainnet' })
        await expect(controller.getActiveNetwork()).resolves.toEqual({
            network: 'mainnet',
        })

        mock.request.mockResolvedValueOnce({ wallet: 'primary' })
        await expect(controller.getPrimaryAccount()).resolves.toEqual({
            wallet: 'primary',
        })

        mock.request.mockResolvedValueOnce({ result: 'ok' })
        await expect(controller.ledgerApi(ledgerApiParams)).resolves.toEqual({
            result: 'ok',
        })
    })

    it('opens the popup and resolves connect after statusChanged', async () => {
        const mock = makeProvider()
        mock.request.mockResolvedValue({
            userUrl: 'https://wallet.example.com/connect',
        })

        const controller = dappSDKController(asProvider(mock))
        const connectPromise = controller.connect()

        await vi.waitFor(() => {
            expect(popupOpen).toHaveBeenCalledWith(
                'https://wallet.example.com/connect'
            )
        })

        mock.emit('statusChanged', {
            connection: { isConnected: true, isNetworkConnected: true },
        })

        await expect(connectPromise).resolves.toEqual({
            isConnected: true,
            isNetworkConnected: true,
        })
    })

    it('opens the popup for prepareExecute when a user URL is returned', async () => {
        const mock = makeProvider()
        mock.request.mockResolvedValue({
            userUrl: 'https://wallet.example.com/prepare',
        })

        const controller = dappSDKController(asProvider(mock))
        await expect(
            controller.prepareExecute(prepareExecuteParams)
        ).resolves.toBeNull()

        expect(popupOpen).toHaveBeenCalledWith(
            'https://wallet.example.com/prepare'
        )
    })

    it('waits for executed transactions in prepareExecuteAndWait', async () => {
        const mock = makeProvider()
        mock.request.mockResolvedValue({
            userUrl: 'https://wallet.example.com/prepare',
        })

        const controller = dappSDKController(asProvider(mock))
        const waitPromise =
            controller.prepareExecuteAndWait(prepareExecuteParams)

        await vi.waitFor(() => {
            expect(mock.on).toHaveBeenCalledWith(
                'txChanged',
                expect.any(Function)
            )
        })

        mock.emit('txChanged', {
            commandId: 'other-command',
            status: 'executed',
        })
        mock.emit('txChanged', {
            commandId: '00000000-0000-4000-8000-000000000001',
            status: 'executed',
            updateId: 'update-1',
        })

        await expect(waitPromise).resolves.toEqual({
            tx: {
                commandId: '00000000-0000-4000-8000-000000000001',
                status: 'executed',
                updateId: 'update-1',
            },
        })
    })

    it('rejects prepareExecuteAndWait when the transaction fails', async () => {
        const mock = makeProvider()
        mock.request.mockResolvedValue({
            userUrl: 'https://wallet.example.com/prepare',
        })

        const controller = dappSDKController(asProvider(mock))
        const waitPromise =
            controller.prepareExecuteAndWait(prepareExecuteParams)

        await vi.waitFor(() => {
            expect(mock.on).toHaveBeenCalledWith(
                'txChanged',
                expect.any(Function)
            )
        })

        mock.emit('txChanged', {
            commandId: '00000000-0000-4000-8000-000000000001',
            status: 'failed',
        })

        await expect(waitPromise).rejects.toBeInstanceOf(JsonRpcError)
        await expect(waitPromise).rejects.toMatchObject({
            code: errorCodes.rpc.transactionRejected,
            message:
                'Transaction with commandId 00000000-0000-4000-8000-000000000001 failed to execute.',
        })
    })

    it('resolves signMessage after a matching signature event', async () => {
        const mock = makeProvider()
        mock.request.mockResolvedValue({
            userUrl: 'https://wallet.example.com/sign?messageId=message-1',
        })

        const controller = dappSDKController(asProvider(mock))
        const signPromise = controller.signMessage(signMessageParams)

        await vi.waitFor(() => {
            expect(mock.on).toHaveBeenCalledWith(
                'messageSignature',
                expect.any(Function)
            )
        })

        mock.emit('messageSignature', {
            messageId: 'other-message',
            status: 'signed',
            signature: 'ignored',
        })
        mock.emit('messageSignature', {
            messageId: 'message-1',
            status: 'pending',
        })
        mock.emit('messageSignature', {
            messageId: 'message-1',
            status: 'signed',
            signature: 'signed-message',
        })

        await expect(signPromise).resolves.toEqual({
            signature: 'signed-message',
        })
    })

    it('throws for event-only controller methods', async () => {
        const mock = makeProvider()
        const controller = dappSDKController(asProvider(mock))

        await expect(controller.accountsChanged()).rejects.toThrow(
            'Only for events.'
        )
        await expect(controller.txChanged()).rejects.toThrow('Only for events.')
        expect(() => controller.messageSignature()).toThrow('Only for events.')
    })
})
