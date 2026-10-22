// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthContext } from '@canton-network/core-wallet-auth'
import type {
    MessageRaw,
    Store,
    Wallet,
} from '@canton-network/core-wallet-store'
import {
    SigningProvider,
    type SigningDriverInterface,
} from '@canton-network/core-signing-lib'
import type { Notifier } from './notification/index.js'
import { SignMessageService } from './sign-message-service.js'

const authContext: AuthContext = {
    userId: 'user-1',
    accessToken: 'access-token-1',
}

const wallet: Wallet = {
    primary: true,
    partyId: 'party::namespace',
    status: 'allocated',
    hint: 'party',
    signingProviderId: SigningProvider.WALLET_KERNEL,
    publicKey: 'wallet-public-key',
    namespace: 'namespace',
    userId: 'user-1',
    networkId: 'network1',
    rights: [],
}

const dfnsWallet: Wallet = {
    ...wallet,
    signingProviderId: SigningProvider.DFNS,
}

const pendingMessage: MessageRaw = {
    id: 'msg-1',
    kind: 'regular',
    status: 'pending',
    userId: 'user-1',
    partyId: wallet.partyId,
    publicKey: wallet.publicKey,
    message: 'Sign this',
    origin: 'https://dapp.example',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
}

const awaitingMessage: MessageRaw = {
    ...pendingMessage,
    status: 'awaiting-signature',
    externalTxId: 'dfns-sig-1',
}

const pendingTokenMessage: MessageRaw = {
    ...pendingMessage,
    id: 'token-msg',
    kind: 'self-issued-token',
    origin: null,
}

function createDriver(options: {
    signMessage?: ReturnType<typeof vi.fn>
    getTransaction?: ReturnType<typeof vi.fn>
}): SigningDriverInterface & { controller: ReturnType<typeof vi.fn> } {
    return {
        controller: vi.fn().mockReturnValue({
            signMessage: options.signMessage ?? vi.fn(),
            getTransaction: options.getTransaction ?? vi.fn(),
        }),
    } as unknown as SigningDriverInterface & {
        controller: ReturnType<typeof vi.fn>
    }
}

function createStore(
    message: MessageRaw = pendingMessage,
    wallets: Wallet[] = [wallet]
): Store & {
    getMessageRaw: ReturnType<typeof vi.fn>
    listMessageRaws: ReturnType<typeof vi.fn>
    removeMessageRaw: ReturnType<typeof vi.fn>
    getWallets: ReturnType<typeof vi.fn>
    setMessageRawStatus: ReturnType<typeof vi.fn>
} {
    return {
        getMessageRaw: vi.fn().mockResolvedValue(message),
        listMessageRaws: vi.fn().mockResolvedValue([message]),
        removeMessageRaw: vi.fn().mockResolvedValue(undefined),
        getWallets: vi.fn().mockResolvedValue(wallets),
        setMessageRawStatus: vi.fn().mockResolvedValue(undefined),
    } as unknown as Store & {
        getMessageRaw: ReturnType<typeof vi.fn>
        listMessageRaws: ReturnType<typeof vi.fn>
        removeMessageRaw: ReturnType<typeof vi.fn>
        getWallets: ReturnType<typeof vi.fn>
        setMessageRawStatus: ReturnType<typeof vi.fn>
    }
}

describe('SignMessageService', () => {
    let notifier: Notifier
    let emit: ReturnType<typeof vi.fn>

    beforeEach(() => {
        emit = vi.fn()
        notifier = { emit } as unknown as Notifier
    })

    describe('getMessage', () => {
        it('returns the message details', async () => {
            const service = new SignMessageService(createStore(), {}, notifier)

            const result = await service.getMessage('msg-1', 'regular')

            expect(result).toEqual({
                message: {
                    id: 'msg-1',
                    status: 'pending',
                    partyId: wallet.partyId,
                    publicKey: wallet.publicKey,
                    message: 'Sign this',
                    origin: 'https://dapp.example',
                    createdAt: pendingMessage.createdAt.toISOString(),
                },
            })
        })

        it('returns externalTxId and failureReason', async () => {
            const store = createStore({
                ...pendingMessage,
                status: 'failed',
                externalTxId: 'provider-req-1',
                failureReason: 'Signing provider returned status: rejected',
            })
            const service = new SignMessageService(store, {}, notifier)

            const result = await service.getMessage('msg-1', 'regular')

            expect(result.message).toMatchObject({
                status: 'failed',
                externalTxId: 'provider-req-1',
                failureReason: 'Signing provider returned status: rejected',
            })
        })

        it('throws when the message does not exist', async () => {
            const store = createStore()
            store.getMessageRaw.mockResolvedValue(undefined)
            const service = new SignMessageService(store, {}, notifier)

            await expect(
                service.getMessage('missing', 'regular')
            ).rejects.toThrow(
                'Message signing request not found with id: missing'
            )
        })

        it('treats a message of another kind as missing', async () => {
            const service = new SignMessageService(
                createStore(pendingTokenMessage),
                {},
                notifier
            )

            await expect(
                service.getMessage('token-msg', 'regular')
            ).rejects.toThrow(
                'Message signing request not found with id: token-msg'
            )
        })
    })

    describe('listMessages', () => {
        it('lists the messages of the requested kind from the store', async () => {
            const store = createStore()
            store.listMessageRaws.mockResolvedValue([pendingTokenMessage])
            const service = new SignMessageService(store, {}, notifier)

            const result = await service.listMessages('self-issued-token')

            expect(store.listMessageRaws).toHaveBeenCalledWith(
                'self-issued-token'
            )
            expect(result.messages.map((message) => message.id)).toEqual([
                'token-msg',
            ])
        })
    })

    describe('deleteMessage', () => {
        it('deletes a pending message owned by the user and emits a failed event', async () => {
            const store = createStore()
            const service = new SignMessageService(store, {}, notifier)

            await service.deleteMessage(authContext, 'msg-1', 'regular')

            expect(store.removeMessageRaw).toHaveBeenCalledWith('msg-1')
            expect(emit).toHaveBeenCalledExactlyOnceWith('messageSignature', {
                status: 'failed',
                messageId: 'msg-1',
            })
            expect(
                store.removeMessageRaw.mock.invocationCallOrder[0]
            ).toBeLessThan(emit.mock.invocationCallOrder[0]!)
        })

        it('deletes a message that is awaiting a signature', async () => {
            const store = createStore(awaitingMessage)
            const service = new SignMessageService(store, {}, notifier)

            await service.deleteMessage(authContext, 'msg-1', 'regular')

            expect(store.removeMessageRaw).toHaveBeenCalledWith('msg-1')
        })

        it('rejects deleting a message that is not pending', async () => {
            const store = createStore({ ...pendingMessage, status: 'signed' })
            const service = new SignMessageService(store, {}, notifier)

            await expect(
                service.deleteMessage(authContext, 'msg-1', 'regular')
            ).rejects.toThrow("Cannot delete message with status 'signed'")
            expect(store.removeMessageRaw).not.toHaveBeenCalled()
            expect(emit).not.toHaveBeenCalled()
        })

        it('rejects deleting a message owned by another user', async () => {
            const store = createStore({
                ...pendingMessage,
                userId: 'other-user',
            })
            const service = new SignMessageService(store, {}, notifier)

            await expect(
                service.deleteMessage(authContext, 'msg-1', 'regular')
            ).rejects.toThrow(
                'Message signing request msg-1 is not owned by user user-1'
            )
            expect(store.removeMessageRaw).not.toHaveBeenCalled()
        })

        it('treats a message of another kind as missing', async () => {
            const store = createStore(pendingTokenMessage)
            const service = new SignMessageService(store, {}, notifier)

            await expect(
                service.deleteMessage(authContext, 'token-msg', 'regular')
            ).rejects.toThrow(
                'Message signing request not found with id: token-msg'
            )
            expect(store.removeMessageRaw).not.toHaveBeenCalled()
            expect(emit).not.toHaveBeenCalled()
        })
    })

    describe('sign', () => {
        it('throws when the message does not exist', async () => {
            const store = createStore()
            store.getMessageRaw.mockResolvedValue(undefined)
            const service = new SignMessageService(store, {}, notifier)

            await expect(
                service.sign(authContext, 'missing', 'regular')
            ).rejects.toThrow(
                'Message signing request not found with id: missing'
            )
        })

        it('treats a message of another kind as missing', async () => {
            const signMessage = vi.fn()
            const store = createStore({
                ...pendingMessage,
                kind: 'self-issued-token',
            })
            const service = new SignMessageService(
                store,
                {
                    [SigningProvider.WALLET_KERNEL]: createDriver({
                        signMessage,
                    }),
                },
                notifier
            )

            await expect(
                service.sign(authContext, 'msg-1', 'regular')
            ).rejects.toThrow(
                'Message signing request not found with id: msg-1'
            )
            expect(signMessage).not.toHaveBeenCalled()
            expect(store.setMessageRawStatus).not.toHaveBeenCalled()
        })

        it('rejects signing a message that is already awaiting a signature', async () => {
            const signMessage = vi.fn()
            const store = createStore(awaitingMessage, [dfnsWallet])
            const service = new SignMessageService(
                store,
                { [SigningProvider.DFNS]: createDriver({ signMessage }) },
                notifier
            )

            await expect(
                service.sign(authContext, 'msg-1', 'regular')
            ).rejects.toThrow(
                "Cannot sign message with status 'awaiting-signature'"
            )
            expect(signMessage).not.toHaveBeenCalled()
            expect(store.setMessageRawStatus).not.toHaveBeenCalled()
        })

        it('rejects signing a message owned by another user', async () => {
            const store = createStore({
                ...pendingMessage,
                userId: 'other-user',
            })
            const service = new SignMessageService(store, {}, notifier)

            await expect(
                service.sign(authContext, 'msg-1', 'regular')
            ).rejects.toThrow(
                'Message signing request msg-1 is not owned by user user-1'
            )
            expect(store.setMessageRawStatus).not.toHaveBeenCalled()
        })

        it('signs a pending wallet-kernel message and emits messageSignature', async () => {
            const signMessage = vi.fn().mockResolvedValue({
                status: 'signed',
                signature: 'signature',
            })
            const store = createStore()
            const service = new SignMessageService(
                store,
                {
                    [SigningProvider.WALLET_KERNEL]: createDriver({
                        signMessage,
                    }),
                },
                notifier
            )

            const result = await service.sign(authContext, 'msg-1', 'regular')

            expect(signMessage).toHaveBeenCalledWith({
                message: 'Sign this',
                keyIdentifier: { publicKey: wallet.publicKey },
                internalTxId: 'msg-1',
            })
            expect(result).toEqual({
                signature: 'signature',
                publicKey: wallet.publicKey,
                status: 'signed',
            })
            expect(store.setMessageRawStatus).toHaveBeenCalledWith(
                'msg-1',
                'signed',
                { signedAt: expect.any(Date), signature: 'signature' }
            )
            expect(emit).toHaveBeenCalledExactlyOnceWith('messageSignature', {
                status: 'signed',
                messageId: 'msg-1',
                signature: 'signature',
            })
        })

        it("fails for wallets whose signing provider doesn't support signMessage", async () => {
            const signMessage = vi.fn()
            const store = createStore(pendingMessage, [
                { ...wallet, signingProviderId: SigningProvider.PARTICIPANT },
            ])
            const service = new SignMessageService(
                store,
                {
                    [SigningProvider.PARTICIPANT]: createDriver({
                        signMessage,
                    }),
                },
                notifier
            )

            await expect(
                service.sign(authContext, 'msg-1', 'regular')
            ).rejects.toThrow(
                'signMessage is only supported for wallet-kernel, dfns, fireblocks, securosys wallets, got participant'
            )
            expect(signMessage).not.toHaveBeenCalled()
            expect(store.setMessageRawStatus).toHaveBeenCalledWith(
                'msg-1',
                'failed',
                {
                    failureReason:
                        'signMessage is only supported for wallet-kernel, dfns, fireblocks, securosys wallets, got participant',
                }
            )
            expect(emit).toHaveBeenCalledWith('messageSignature', {
                status: 'failed',
                messageId: 'msg-1',
            })
        })

        it('fails when no driver is configured for the wallet signing provider', async () => {
            const store = createStore()
            const service = new SignMessageService(store, {}, notifier)

            await expect(
                service.sign(authContext, 'msg-1', 'regular')
            ).rejects.toThrow('wallet-kernel signing driver not available')
            expect(store.setMessageRawStatus).toHaveBeenCalledWith(
                'msg-1',
                'failed',
                { failureReason: 'wallet-kernel signing driver not available' }
            )
            expect(emit).toHaveBeenCalledWith('messageSignature', {
                status: 'failed',
                messageId: 'msg-1',
            })
        })

        it('refuses to sign an empty message without calling the driver', async () => {
            const signMessage = vi.fn()
            const store = createStore({ ...pendingMessage, message: '' })
            const service = new SignMessageService(
                store,
                {
                    [SigningProvider.WALLET_KERNEL]: createDriver({
                        signMessage,
                    }),
                },
                notifier
            )

            await expect(
                service.sign(authContext, 'msg-1', 'regular')
            ).rejects.toThrow('has an empty message')
            expect(signMessage).not.toHaveBeenCalled()
            expect(store.setMessageRawStatus).toHaveBeenCalledWith(
                'msg-1',
                'failed',
                { failureReason: 'Message request msg-1 has an empty message.' }
            )
            expect(emit).toHaveBeenCalledWith('messageSignature', {
                status: 'failed',
                messageId: 'msg-1',
            })
        })

        it('refuses to sign when no wallet exists for the message party', async () => {
            const signMessage = vi.fn()
            const store = createStore(pendingMessage, [])
            const service = new SignMessageService(
                store,
                {
                    [SigningProvider.WALLET_KERNEL]: createDriver({
                        signMessage,
                    }),
                },
                notifier
            )
            const failureReason = `No wallet found for partyId ${wallet.partyId} (from message request msg-1)`

            await expect(
                service.sign(authContext, 'msg-1', 'regular')
            ).rejects.toThrow(failureReason)
            expect(signMessage).not.toHaveBeenCalled()
            expect(store.setMessageRawStatus).toHaveBeenCalledWith(
                'msg-1',
                'failed',
                { failureReason }
            )
            expect(emit).toHaveBeenCalledWith('messageSignature', {
                status: 'failed',
                messageId: 'msg-1',
            })
        })

        it('refuses to sign when the wallet public key differs from the requested one', async () => {
            const signMessage = vi.fn()
            const store = createStore(pendingMessage, [
                { ...wallet, publicKey: 'rotated-public-key' },
            ])
            const service = new SignMessageService(
                store,
                {
                    [SigningProvider.WALLET_KERNEL]: createDriver({
                        signMessage,
                    }),
                },
                notifier
            )
            const failureReason = `Wallet public key changed for partyId ${wallet.partyId}; refusing to sign message request msg-1`

            await expect(
                service.sign(authContext, 'msg-1', 'regular')
            ).rejects.toThrow(failureReason)
            expect(signMessage).not.toHaveBeenCalled()
            expect(store.setMessageRawStatus).toHaveBeenCalledWith(
                'msg-1',
                'failed',
                { failureReason }
            )
            expect(emit).toHaveBeenCalledWith('messageSignature', {
                status: 'failed',
                messageId: 'msg-1',
            })
        })

        describe('with an asynchronous signing provider', () => {
            function createDfnsService(signMessage: ReturnType<typeof vi.fn>) {
                const store = createStore(pendingMessage, [dfnsWallet])
                const driver = createDriver({ signMessage })
                const service = new SignMessageService(
                    store,
                    { [SigningProvider.DFNS]: driver },
                    notifier
                )
                return { store, driver, service }
            }

            it('stores awaiting-signature with the provider txId when the driver returns pending', async () => {
                const signMessage = vi.fn().mockResolvedValue({
                    status: 'pending',
                    txId: 'dfns-sig-1',
                })
                const { store, driver, service } =
                    createDfnsService(signMessage)

                const result = await service.sign(
                    authContext,
                    'msg-1',
                    'regular'
                )

                expect(driver.controller).toHaveBeenCalledWith(
                    authContext.userId
                )
                expect(signMessage).toHaveBeenCalledWith({
                    message: 'Sign this',
                    keyIdentifier: { publicKey: dfnsWallet.publicKey },
                    internalTxId: 'msg-1',
                })
                expect(result).toEqual({
                    publicKey: dfnsWallet.publicKey,
                    status: 'awaiting-signature',
                    externalTxId: 'dfns-sig-1',
                })
                expect(
                    store.setMessageRawStatus
                ).toHaveBeenCalledExactlyOnceWith(
                    'msg-1',
                    'awaiting-signature',
                    { externalTxId: 'dfns-sig-1' }
                )
                expect(emit).not.toHaveBeenCalled()
            })

            it('fails when the driver returns pending without a txId', async () => {
                const { store, service } = createDfnsService(
                    vi.fn().mockResolvedValue({ status: 'pending' })
                )

                await expect(
                    service.sign(authContext, 'msg-1', 'regular')
                ).rejects.toThrow(
                    'Signing provider returned status: pending without a txId'
                )
                expect(
                    store.setMessageRawStatus
                ).toHaveBeenCalledExactlyOnceWith('msg-1', 'failed', {
                    failureReason:
                        'Signing provider returned status: pending without a txId',
                })
                expect(emit).toHaveBeenCalledWith('messageSignature', {
                    status: 'failed',
                    messageId: 'msg-1',
                })
            })

            it('stores the signature and the provider txId when the driver signs immediately', async () => {
                const { store, service } = createDfnsService(
                    vi.fn().mockResolvedValue({
                        status: 'signed',
                        txId: 'dfns-sig-1',
                        signature: 'dfns-signature',
                    })
                )

                const result = await service.sign(
                    authContext,
                    'msg-1',
                    'regular'
                )

                expect(result).toEqual({
                    publicKey: dfnsWallet.publicKey,
                    status: 'signed',
                    signature: 'dfns-signature',
                    externalTxId: 'dfns-sig-1',
                })
                expect(store.setMessageRawStatus).toHaveBeenCalledWith(
                    'msg-1',
                    'signed',
                    {
                        signedAt: expect.any(Date),
                        signature: 'dfns-signature',
                        externalTxId: 'dfns-sig-1',
                    }
                )
                expect(emit).toHaveBeenCalledWith('messageSignature', {
                    status: 'signed',
                    messageId: 'msg-1',
                    signature: 'dfns-signature',
                })
            })

            it('fails when the driver returns signed without a signature', async () => {
                const { store, service } = createDfnsService(
                    vi.fn().mockResolvedValue({
                        status: 'signed',
                        txId: 'dfns-sig-1',
                    })
                )

                await expect(
                    service.sign(authContext, 'msg-1', 'regular')
                ).rejects.toThrow('No signature returned from signing driver')
                expect(
                    store.setMessageRawStatus
                ).toHaveBeenCalledExactlyOnceWith('msg-1', 'failed', {
                    failureReason: 'No signature returned from signing driver',
                })
            })

            it.each(['failed', 'rejected'] as const)(
                'stores failed with a failure reason when the driver returns %s',
                async (status) => {
                    const { store, service } = createDfnsService(
                        vi.fn().mockResolvedValue({
                            status,
                            txId: 'dfns-sig-1',
                        })
                    )

                    const result = await service.sign(
                        authContext,
                        'msg-1',
                        'regular'
                    )

                    expect(result).toEqual({
                        publicKey: dfnsWallet.publicKey,
                        status: 'failed',
                        failureReason: `Signing provider returned status: ${status}`,
                        externalTxId: 'dfns-sig-1',
                    })
                    expect(store.setMessageRawStatus).toHaveBeenCalledWith(
                        'msg-1',
                        'failed',
                        {
                            failureReason: `Signing provider returned status: ${status}`,
                            externalTxId: 'dfns-sig-1',
                        }
                    )
                    expect(emit).toHaveBeenCalledWith('messageSignature', {
                        status: 'failed',
                        messageId: 'msg-1',
                    })
                }
            )

            it('stores the driver error as the failure reason and throws it', async () => {
                const { store, service } = createDfnsService(
                    vi.fn().mockResolvedValue({
                        error: 'key_not_found',
                        error_description:
                            'No Dfns key found for the provided key identifier.',
                    })
                )

                await expect(
                    service.sign(authContext, 'msg-1', 'regular')
                ).rejects.toThrow(
                    'No Dfns key found for the provided key identifier.'
                )
                expect(store.setMessageRawStatus).toHaveBeenCalledWith(
                    'msg-1',
                    'failed',
                    {
                        failureReason:
                            'No Dfns key found for the provided key identifier.',
                    }
                )
                expect(emit).toHaveBeenCalledWith('messageSignature', {
                    status: 'failed',
                    messageId: 'msg-1',
                })
            })
        })
    })

    describe('refreshMessage', () => {
        function createDfnsService(
            getTransaction: ReturnType<typeof vi.fn>,
            message: MessageRaw = awaitingMessage
        ) {
            const store = createStore(message, [dfnsWallet])
            const driver = createDriver({ getTransaction })
            const service = new SignMessageService(
                store,
                { [SigningProvider.DFNS]: driver },
                notifier
            )
            return { store, driver, service }
        }

        it('throws when the message does not exist', async () => {
            const store = createStore()
            store.getMessageRaw.mockResolvedValue(undefined)
            const service = new SignMessageService(store, {}, notifier)

            await expect(
                service.refreshMessage(authContext, 'missing', 'regular')
            ).rejects.toThrow(
                'Message signing request not found with id: missing'
            )
        })

        it('treats a message of another kind as missing', async () => {
            const getTransaction = vi.fn()
            const store = createStore(
                { ...awaitingMessage, kind: 'self-issued-token' },
                [dfnsWallet]
            )
            const service = new SignMessageService(
                store,
                { [SigningProvider.DFNS]: createDriver({ getTransaction }) },
                notifier
            )

            await expect(
                service.refreshMessage(authContext, 'msg-1', 'regular')
            ).rejects.toThrow(
                'Message signing request not found with id: msg-1'
            )
            expect(getTransaction).not.toHaveBeenCalled()
            expect(store.setMessageRawStatus).not.toHaveBeenCalled()
        })

        it('returns the stored state without calling the driver when the message is not awaiting a signature', async () => {
            const getTransaction = vi.fn()
            const { store, service } = createDfnsService(getTransaction, {
                ...awaitingMessage,
                status: 'failed',
                failureReason: 'Signing provider returned status: rejected',
            })

            const result = await service.refreshMessage(
                authContext,
                'msg-1',
                'regular'
            )

            expect(result).toEqual({
                status: 'failed',
                externalTxId: 'dfns-sig-1',
                failureReason: 'Signing provider returned status: rejected',
            })
            expect(getTransaction).not.toHaveBeenCalled()
            expect(store.setMessageRawStatus).not.toHaveBeenCalled()
        })

        it('stores the signature and emits signed when the provider has signed', async () => {
            const getTransaction = vi.fn().mockResolvedValue({
                txId: 'dfns-sig-1',
                status: 'signed',
                signature: 'provider-signature',
            })
            const { store, driver, service } = createDfnsService(getTransaction)

            const result = await service.refreshMessage(
                authContext,
                'msg-1',
                'regular'
            )

            expect(driver.controller).toHaveBeenCalledWith(authContext.userId)
            expect(getTransaction).toHaveBeenCalledWith({
                userId: authContext.userId,
                txId: 'dfns-sig-1',
            })
            expect(result).toEqual({
                status: 'signed',
                externalTxId: 'dfns-sig-1',
                signature: 'provider-signature',
            })
            expect(store.setMessageRawStatus).toHaveBeenCalledWith(
                'msg-1',
                'signed',
                {
                    signedAt: expect.any(Date),
                    signature: 'provider-signature',
                    externalTxId: 'dfns-sig-1',
                }
            )
            expect(emit).toHaveBeenCalledExactlyOnceWith('messageSignature', {
                status: 'signed',
                messageId: 'msg-1',
                signature: 'provider-signature',
            })
        })

        it('throws and keeps the message awaiting a signature when the provider reports signed without a signature', async () => {
            const { store, service } = createDfnsService(
                vi.fn().mockResolvedValue({
                    txId: 'dfns-sig-1',
                    status: 'signed',
                })
            )

            await expect(
                service.refreshMessage(authContext, 'msg-1', 'regular')
            ).rejects.toThrow('No signature returned from signing driver')
            expect(store.setMessageRawStatus).not.toHaveBeenCalled()
            expect(emit).not.toHaveBeenCalled()
        })

        it.each(['failed', 'rejected'] as const)(
            'marks the message failed and emits failed when the provider reports %s',
            async (providerStatus) => {
                const { store, service } = createDfnsService(
                    vi.fn().mockResolvedValue({
                        txId: 'dfns-sig-1',
                        status: providerStatus,
                    })
                )

                const result = await service.refreshMessage(
                    authContext,
                    'msg-1',
                    'regular'
                )

                expect(result).toEqual({
                    status: 'failed',
                    externalTxId: 'dfns-sig-1',
                    failureReason: `Signing provider returned status: ${providerStatus}`,
                })
                expect(store.setMessageRawStatus).toHaveBeenCalledWith(
                    'msg-1',
                    'failed',
                    {
                        externalTxId: 'dfns-sig-1',
                        failureReason: `Signing provider returned status: ${providerStatus}`,
                    }
                )
                expect(emit).toHaveBeenCalledExactlyOnceWith(
                    'messageSignature',
                    { status: 'failed', messageId: 'msg-1' }
                )
            }
        )

        it('keeps awaiting-signature when the provider is still pending', async () => {
            const { store, service } = createDfnsService(
                vi.fn().mockResolvedValue({
                    txId: 'dfns-sig-1',
                    status: 'pending',
                })
            )

            const result = await service.refreshMessage(
                authContext,
                'msg-1',
                'regular'
            )

            expect(result).toEqual({
                status: 'awaiting-signature',
                externalTxId: 'dfns-sig-1',
            })
            expect(store.setMessageRawStatus).not.toHaveBeenCalled()
            expect(emit).not.toHaveBeenCalled()
        })
    })

    describe('self-issued token messages', () => {
        const pendingToken: MessageRaw = {
            ...pendingMessage,
            kind: 'self-issued-token',
        }
        const awaitingToken: MessageRaw = {
            ...awaitingMessage,
            kind: 'self-issued-token',
        }

        it('stores the signature without emitting messageSignature', async () => {
            const signMessage = vi.fn().mockResolvedValue({
                status: 'signed',
                signature: 'signature',
            })
            const store = createStore(pendingToken, [dfnsWallet])
            const service = new SignMessageService(
                store,
                { [SigningProvider.DFNS]: createDriver({ signMessage }) },
                notifier
            )

            const result = await service.sign(
                authContext,
                'msg-1',
                'self-issued-token'
            )

            expect(result.status).toBe('signed')
            expect(store.setMessageRawStatus).toHaveBeenCalledWith(
                'msg-1',
                'signed',
                expect.objectContaining({ signature: 'signature' })
            )
            expect(emit).not.toHaveBeenCalled()
        })

        it('stores a signing failure without emitting messageSignature', async () => {
            const signMessage = vi.fn().mockResolvedValue({
                error: 'signing_error',
                error_description: 'provider unavailable',
            })
            const store = createStore(pendingToken, [dfnsWallet])
            const service = new SignMessageService(
                store,
                { [SigningProvider.DFNS]: createDriver({ signMessage }) },
                notifier
            )

            await expect(
                service.sign(authContext, 'msg-1', 'self-issued-token')
            ).rejects.toThrow('provider unavailable')
            expect(store.setMessageRawStatus).toHaveBeenCalledWith(
                'msg-1',
                'failed',
                { failureReason: 'provider unavailable' }
            )
            expect(emit).not.toHaveBeenCalled()
        })

        it('stores a signature found on refresh without emitting messageSignature', async () => {
            const store = createStore(awaitingToken, [dfnsWallet])
            const service = new SignMessageService(
                store,
                {
                    [SigningProvider.DFNS]: createDriver({
                        getTransaction: vi.fn().mockResolvedValue({
                            txId: 'dfns-sig-1',
                            status: 'signed',
                            signature: 'provider-signature',
                        }),
                    }),
                },
                notifier
            )

            const result = await service.refreshMessage(
                authContext,
                'msg-1',
                'self-issued-token'
            )

            expect(result.status).toBe('signed')
            expect(store.setMessageRawStatus).toHaveBeenCalledWith(
                'msg-1',
                'signed',
                expect.objectContaining({ signature: 'provider-signature' })
            )
            expect(emit).not.toHaveBeenCalled()
        })

        it('deletes the message without emitting messageSignature', async () => {
            const store = createStore(pendingToken)
            const service = new SignMessageService(store, {}, notifier)

            await service.deleteMessage(
                authContext,
                'msg-1',
                'self-issued-token'
            )

            expect(store.removeMessageRaw).toHaveBeenCalledWith('msg-1')
            expect(emit).not.toHaveBeenCalled()
        })
    })
})
