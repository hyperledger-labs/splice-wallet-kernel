// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type {
    MessageRaw,
    MessageRawKind,
    Store,
} from '@canton-network/core-wallet-store'
import {
    isRpcError,
    SIGN_MESSAGE_CAPABLE_SIGNING_PROVIDERS,
    SigningProvider,
} from '@canton-network/core-signing-lib'
import type { AuthContext } from '@canton-network/core-wallet-auth'
import type {
    GetMessageToSignResult,
    GetSignMessageStatusResult,
    ListMessagesToSignResult,
    MessageRaw as MessageToSign,
    SignMessageResult,
} from '@canton-network/core-wallet-user-rpc-client'
import type { MessageSignatureEvent } from '@canton-network/core-wallet-dapp-rpc-client'
import type { SigningDrivers } from './types.js'
import type { Notifier } from './notification/index.js'

export class SignMessageService {
    constructor(
        private store: Store,
        private signingDrivers: SigningDrivers = {},
        private notifier: Notifier
    ) {}

    private async requireMessage(
        messageId: MessageRaw['id'],
        kind: MessageRawKind
    ): Promise<MessageRaw> {
        const message = await this.store.getMessageRaw(messageId)
        if (!message || message.kind !== kind) {
            throw new Error(
                `Message signing request not found with id: ${messageId}`
            )
        }
        return message
    }

    // Only dApp-originated messages are reported to the session's listeners.
    private notify(message: MessageRaw, event: MessageSignatureEvent): void {
        if (message.kind === 'regular') {
            this.notifier.emit('messageSignature', event)
        }
    }

    private toMessageToSign(message: MessageRaw): MessageToSign {
        return {
            id: message.id,
            status: message.status,
            partyId: message.partyId,
            publicKey: message.publicKey,
            createdAt: message.createdAt.toISOString(),
            message: message.message,
            ...(message.origin !== null && { origin: message.origin }),
            ...(message.signedAt && {
                signedAt: message.signedAt.toISOString(),
            }),
            ...(message.signature && { signature: message.signature }),
            ...(message.externalTxId && {
                externalTxId: message.externalTxId,
            }),
            ...(message.failureReason && {
                failureReason: message.failureReason,
            }),
        }
    }

    public async getMessage(
        messageId: MessageRaw['id'],
        kind: MessageRawKind
    ): Promise<GetMessageToSignResult> {
        const message = await this.requireMessage(messageId, kind)
        return { message: this.toMessageToSign(message) }
    }

    public async listMessages(
        kind: MessageRawKind
    ): Promise<ListMessagesToSignResult> {
        const messages = await this.store.listMessageRaws(kind)
        return {
            messages: messages.map((message) => this.toMessageToSign(message)),
        }
    }

    public async deleteMessage(
        authContext: AuthContext,
        messageId: MessageRaw['id'],
        kind: MessageRawKind
    ): Promise<void> {
        const message = await this.requireMessage(messageId, kind)
        if (
            message.status !== 'pending' &&
            message.status !== 'awaiting-signature'
        ) {
            throw new Error(
                `Cannot delete message with status '${message.status}'. Only pending or awaiting-signature messages can be deleted.`
            )
        }
        const userId = authContext.userId
        if (message.userId !== userId) {
            throw new Error(
                `Message signing request ${message.id} is not owned by user ${userId}`
            )
        }

        await this.store.removeMessageRaw(message.id)
        this.notify(message, { status: 'failed', messageId: message.id })
    }

    public async sign(
        authContext: AuthContext,
        messageId: MessageRaw['id'],
        kind: MessageRawKind
    ): Promise<SignMessageResult> {
        const pending = await this.requireMessage(messageId, kind)
        if (pending.status !== 'pending') {
            throw new Error(
                `Cannot sign message with status '${pending.status}'. Only pending messages can be signed.`
            )
        }

        const userId = authContext.userId
        if (pending.userId !== userId) {
            throw new Error(
                `Message signing request ${pending.id} is not owned by user ${userId}`
            )
        }

        const emitFailedAndPersist = async (
            details: string
        ): Promise<never> => {
            // Best-effort: make sure listeners see a terminal state.
            try {
                await this.store.setMessageRawStatus(pending.id, 'failed', {
                    failureReason: details,
                })
            } catch {
                // ignore (e.g. record removed concurrently)
            }
            this.notify(pending, { status: 'failed', messageId: pending.id })
            // Preserve the original error message for the caller/UI.
            throw new Error(details)
        }

        if (!pending.message) {
            return await emitFailedAndPersist(
                `Message request ${pending.id} has an empty message.`
            )
        }

        const wallet = (await this.store.getWallets()).find(
            (w) => w.partyId === pending.partyId
        )
        if (!wallet) {
            return await emitFailedAndPersist(
                `No wallet found for partyId ${pending.partyId} (from message request ${pending.id})`
            )
        }
        if (wallet.publicKey !== pending.publicKey) {
            return await emitFailedAndPersist(
                `Wallet public key changed for partyId ${pending.partyId}; refusing to sign message request ${pending.id}`
            )
        }
        if (
            !SIGN_MESSAGE_CAPABLE_SIGNING_PROVIDERS.includes(
                wallet.signingProviderId as SigningProvider
            )
        ) {
            return await emitFailedAndPersist(
                `signMessage is only supported for ${SIGN_MESSAGE_CAPABLE_SIGNING_PROVIDERS.join(', ')} wallets, got ${wallet.signingProviderId}`
            )
        }

        const driver =
            this.signingDrivers[
                wallet.signingProviderId as SigningProvider
            ]?.controller(userId)
        if (!driver) {
            return await emitFailedAndPersist(
                `${wallet.signingProviderId} signing driver not available`
            )
        }

        const result = await driver.signMessage({
            message: pending.message,
            keyIdentifier: { publicKey: wallet.publicKey },
            internalTxId: pending.id,
        })

        if (isRpcError(result)) {
            return await emitFailedAndPersist(result.error_description)
        }

        if (result.status === 'signed') {
            if (!result.signature) {
                return await emitFailedAndPersist(
                    'No signature returned from signing driver'
                )
            }

            await this.store.setMessageRawStatus(pending.id, 'signed', {
                signedAt: new Date(),
                signature: result.signature,
                ...(result.txId && { externalTxId: result.txId }),
            })

            this.notify(pending, {
                status: 'signed',
                messageId: pending.id,
                signature: result.signature,
            })

            return {
                status: result.status,
                signature: result.signature,
                publicKey: wallet.publicKey,
                ...(result.txId && { externalTxId: result.txId }),
            }
        }

        if (result.status === 'pending' && result.txId) {
            await this.store.setMessageRawStatus(
                pending.id,
                'awaiting-signature',
                { externalTxId: result.txId }
            )
            return {
                publicKey: wallet.publicKey,
                status: 'awaiting-signature',
                externalTxId: result.txId,
            }
        }

        if (result.status === 'failed' || result.status === 'rejected') {
            const failureReason = `Signing provider returned status: ${result.status}`
            await this.store.setMessageRawStatus(pending.id, 'failed', {
                failureReason,
                ...(result.txId && { externalTxId: result.txId }),
            })
            this.notify(pending, { status: 'failed', messageId: pending.id })
            return {
                publicKey: wallet.publicKey,
                status: 'failed',
                failureReason,
                ...(result.txId && { externalTxId: result.txId }),
            }
        }

        return await emitFailedAndPersist(
            `Signing provider returned status: ${result.status} without a txId`
        )
    }

    public async refreshMessage(
        authContext: AuthContext,
        messageId: MessageRaw['id'],
        kind: MessageRawKind
    ): Promise<GetSignMessageStatusResult> {
        const message = await this.requireMessage(messageId, kind)

        if (!message.externalTxId || message.status !== 'awaiting-signature') {
            return {
                status: message.status,
                ...(message.externalTxId && {
                    externalTxId: message.externalTxId,
                }),
                ...(message.signature && { signature: message.signature }),
                ...(message.failureReason && {
                    failureReason: message.failureReason,
                }),
            }
        }

        const wallet = (await this.store.getWallets()).find(
            (w) => w.partyId === message.partyId
        )
        if (!wallet) {
            throw new Error(`No wallet found for partyId ${message.partyId}`)
        }

        const provider = wallet.signingProviderId as SigningProvider
        const signingProvider = this.signingDrivers[provider]
        if (!signingProvider) {
            throw new Error(`No driver found for provider ${provider}`)
        }
        if (provider === SigningProvider.BLOCKDAEMON && !authContext.email) {
            throw new Error(
                'Invalid auth context (missing email) for SigningProvider BlockDaemon'
            )
        }

        const controllerId =
            provider === SigningProvider.BLOCKDAEMON
                ? authContext.email
                : authContext.userId
        const signingDriver = signingProvider.controller(controllerId)
        const signingResult = await signingDriver.getTransaction({
            userId: controllerId,
            txId: message.externalTxId,
        })
        if (isRpcError(signingResult)) {
            throw new Error(signingResult.error_description)
        }

        if (signingResult.status === 'signed') {
            if (!signingResult.signature) {
                throw new Error('No signature returned from signing driver')
            }

            await this.store.setMessageRawStatus(message.id, 'signed', {
                signedAt: new Date(),
                signature: signingResult.signature,
                externalTxId: message.externalTxId,
            })
            this.notify(message, {
                status: 'signed',
                messageId: message.id,
                signature: signingResult.signature,
            })
            return {
                status: 'signed',
                externalTxId: message.externalTxId,
                signature: signingResult.signature,
            }
        }

        if (
            signingResult.status === 'failed' ||
            signingResult.status === 'rejected'
        ) {
            const failureReason = `Signing provider returned status: ${signingResult.status}`
            await this.store.setMessageRawStatus(message.id, 'failed', {
                externalTxId: message.externalTxId,
                failureReason,
            })
            this.notify(message, { status: 'failed', messageId: message.id })
            return {
                status: 'failed',
                externalTxId: message.externalTxId,
                failureReason,
            }
        }

        return {
            status: 'awaiting-signature',
            externalTxId: message.externalTxId,
        }
    }
}
