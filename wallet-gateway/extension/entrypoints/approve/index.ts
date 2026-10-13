// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html, nothing } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import {
    BaseElement,
    handleErrorToast,
} from '@canton-network/core-wallet-ui-components'
import {
    type ParsedTransactionInfo,
    parsePreparedTransaction,
} from '@canton-network/core-tx-visualizer'
import { SigningProvider } from '@canton-network/core-signing-lib'
import { PartyLevelRight } from '@canton-network/core-wallet-store'
import type {
    SignResult,
    Wallet,
} from '@canton-network/core-wallet-user-rpc-client'
import { createUserClient } from '@/utils/legacy-frontend/rpc-client'
import { setLocationHref } from '@/utils/legacy-frontend/navigation.js'
import { stateManager } from '@/utils/legacy-frontend/state-manager'
import { detectCurrentOrigin } from '@/utils/legacy-frontend/listeners.js'
import { toRelHref } from '@/utils/legacy-frontend/routing'
import { showToast } from '@/utils/legacy-frontend/utils'
import '@/utils/legacy-frontend'

@customElement('user-ui-approve')
export class ApproveUi extends BaseElement {
    @state() accessor loading = true
    @state() accessor transactionLoaded = false
    @state() accessor isApproving = false
    @state() accessor isDeleting = false
    @state() accessor disabled = false
    @state() accessor errorMessage: string | null = null
    @state() accessor transactionId = ''
    @state() accessor commandId = ''
    @state() accessor partyId = ''
    @state() accessor txHash = ''
    @state() accessor tx = ''
    @state() accessor txParsed: ParsedTransactionInfo | null = null
    @state() accessor status = ''
    @state() accessor createdAt: string | null = null
    @state() accessor signedAt: string | null = null

    static override styles = [
        BaseElement.styles,
        css`
            :host {
                display: block;
            }

            .approval-state {
                max-width: 900px;
                margin: 0 auto;
            }

            .approval-state h1 {
                color: var(--wg-text);
            }

            .approval-state p {
                max-width: 70ch;
            }
        `,
    ]

    override connectedCallback(): void {
        super.connectedCallback()
        const url = new URL(window.location.href)
        this.transactionId = url.searchParams.get('transactionId') || ''
        void this.updateState()
    }

    private get actionInProgress(): boolean {
        return this.isApproving || this.isDeleting || this.disabled
    }

    private get canApprove(): boolean {
        return (
            this.transactionLoaded &&
            this.status === 'pending' &&
            this.partyId.length > 0 &&
            this.errorMessage === null &&
            !this.actionInProgress
        )
    }

    private get canReject(): boolean {
        return (
            this.transactionLoaded &&
            this.status === 'pending' &&
            !this.actionInProgress
        )
    }

    private async createClient() {
        const currentOrigin = await detectCurrentOrigin()
        const accessToken = await stateManager.accessToken.get(currentOrigin)
        return createUserClient(accessToken || undefined)
    }

    private selectActingWallet(
        wallets: Wallet[],
        payload?: string
    ): Wallet | undefined {
        if (payload) {
            try {
                const parsedPayload = JSON.parse(payload) as {
                    actAs?: unknown
                }
                const actAs = parsedPayload.actAs
                if (Array.isArray(actAs) && typeof actAs[0] === 'string') {
                    const actingParty = actAs[0]
                    return wallets.find(
                        (wallet) => wallet.partyId === actingParty
                    )
                }
            } catch {
                // The prepared transaction remains authoritative if legacy
                // payload data cannot be decoded.
            }
        }

        return wallets.find((wallet) => wallet.primary)
    }

    private async updateState(): Promise<void> {
        this.loading = true
        this.errorMessage = null

        if (!this.transactionId) {
            this.errorMessage =
                'The approval link is missing a transaction ID. Return to the dApp and prepare the transaction again.'
            this.loading = false
            return
        }

        try {
            const userClient = await this.createClient()
            const transaction = await userClient.request({
                method: 'getTransaction',
                params: { transactionId: this.transactionId },
            })

            this.transactionLoaded = true
            this.transactionId = transaction.id
            this.commandId = transaction.commandId
            this.txHash = transaction.preparedTransactionHash
            this.tx = transaction.preparedTransaction
            this.status = transaction.status
            this.createdAt = transaction.createdAt || null
            this.signedAt = transaction.signedAt || null

            try {
                this.txParsed = parsePreparedTransaction(this.tx)
            } catch (error) {
                logger.error('Failed to parse prepared transaction: {*}', {
                    error,
                    transactionId: this.transactionId,
                })
                this.txParsed = null
                this.errorMessage ??=
                    'This transaction could not be decoded and cannot be approved safely.'
            }

            if (transaction.status !== 'pending') {
                this.errorMessage ??= `This transaction is ${transaction.status} and can no longer be approved or rejected.`
            }
            const wallets = await userClient.request({
                method: 'listWallets',
                params: {},
            })
            const actingWallet = this.selectActingWallet(
                wallets,
                transaction.payload
            )
            this.partyId = actingWallet?.partyId || ''

            if (!actingWallet) {
                this.errorMessage ??=
                    'No acting wallet was found for this transaction. Return to the dApp and prepare it again.'
            } else if (
                actingWallet.signingProviderId !== SigningProvider.WALLET_KERNEL
            ) {
                this.errorMessage ??=
                    'This transaction requires an unsupported signing provider. Select a wallet-kernel wallet and prepare it again.'
            } else if (
                !actingWallet.rights?.includes(PartyLevelRight.CanActAs) &&
                !actingWallet.rights?.includes(PartyLevelRight.CanExecuteAs)
            ) {
                this.errorMessage ??=
                    'The acting wallet is read-only and cannot submit transactions.'
            }
        } catch (error) {
            logger.error('Failed to load transaction approval: {*}', {
                error,
                transactionId: this.transactionId,
            })
            this.errorMessage =
                error instanceof Error
                    ? error.message
                    : 'The transaction could not be loaded. Return to the dApp and try again.'
        } finally {
            this.loading = false
        }
    }

    private goHome(): void {
        this.disabled = true
        window.setTimeout(() => setLocationHref(toRelHref('/')), 1000)
    }

    private async handleReject(): Promise<void> {
        if (!this.canReject || this.actionInProgress) return
        if (!confirm(`Reject pending activity "${this.commandId}"?`)) return

        this.isDeleting = true
        try {
            const userClient = await this.createClient()
            await userClient.request({
                method: 'deleteTransaction',
                params: { transactionId: this.transactionId },
            })
            showToast('', 'Activity rejected successfully', 'success')
            this.goHome()
        } catch (error) {
            logger.error('Failed to reject transaction: {*}', {
                error,
                transactionId: this.transactionId,
            })
            handleErrorToast(error, { message: 'Error rejecting activity' })
            await this.updateState()
        } finally {
            this.isDeleting = false
        }
    }

    private async handleApprove(): Promise<void> {
        if (!this.canApprove || this.actionInProgress) return

        this.isApproving = true
        try {
            const userClient = await this.createClient()
            const result: SignResult = await userClient.request({
                method: 'sign',
                params: {
                    transactionId: this.transactionId,
                    partyId: this.partyId,
                },
            })

            if (result.status === 'signed') {
                await userClient.request({
                    method: 'execute',
                    params: {
                        transactionId: this.transactionId,
                        partyId: this.partyId,
                    },
                })
                showToast('', 'Activity executed successfully', 'success')
                this.goHome()
                return
            }

            if (result.status === 'pending') {
                showToast(
                    'Activity pending',
                    'Complete signing in your external provider, then return to this approval.',
                    'info'
                )
            } else {
                showToast(
                    '',
                    result.status === 'rejected'
                        ? 'Activity was rejected'
                        : 'Activity failed',
                    'error'
                )
            }
            await this.updateState()
        } catch (error) {
            logger.error('Failed to approve transaction: {*}', {
                error,
                transactionId: this.transactionId,
            })
            handleErrorToast(error, { message: 'Error executing activity' })
            await this.updateState()
        } finally {
            this.isApproving = false
        }
    }

    protected override render() {
        if (this.loading && !this.transactionLoaded) {
            return html`<wg-loading-state
                text="Loading transaction"
            ></wg-loading-state>`
        }

        if (!this.transactionLoaded) {
            return html`
                <section class="approval-state" role="alert" aria-live="polite">
                    <h1 class="h4 fw-semibold mb-3">
                        Unable to review transaction
                    </h1>
                    <p class="text-body-secondary mb-0">${this.errorMessage}</p>
                </section>
            `
        }

        return html`
            ${
                this.errorMessage
                    ? html`
                          <div
                              class="approval-state alert alert-danger"
                              role="alert"
                              aria-live="polite"
                          >
                              ${this.errorMessage}
                          </div>
                      `
                    : nothing
            }
            <wg-transaction-detail
                .commandId=${this.commandId}
                .status=${this.status}
                .txHash=${this.txHash}
                .tx=${this.tx}
                .parsed=${this.txParsed}
                .createdAt=${this.createdAt}
                .signedAt=${this.signedAt}
                .isApproving=${this.isApproving}
                .isDeleting=${this.isDeleting}
                .disabled=${this.disabled}
                @transaction-approve=${this.handleApprove}
                @transaction-delete=${this.handleReject}
            ></wg-transaction-detail>
        `
    }
}
