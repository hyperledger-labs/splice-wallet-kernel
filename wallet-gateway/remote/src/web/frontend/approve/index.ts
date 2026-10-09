// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import {
    BaseElement,
    handleErrorToast,
    toRelHref,
} from '@canton-network/core-wallet-ui-components'
import {
    type ParsedTransactionInfo,
    parsePreparedTransaction,
} from '@canton-network/core-tx-visualizer'
import { createUserClient } from '../rpc-client'
import { setLocationHref } from '../navigation.js'
import { stateManager } from '../state-manager'
import '../index'
import { ACTIVITIES_PAGE_REDIRECT } from '../constants'
import { showToast } from '../utils'
import type {
    SignResult,
    GetTransactionStatusResult,
} from '@canton-network/core-wallet-user-rpc-client'
import { PartyLevelRight } from '@canton-network/core-wallet-store'
import { detectCurrentOrigin } from '../listeners.js'

@customElement('user-ui-approve')
export class ApproveUi extends BaseElement {
    @state() accessor isApproving = false
    @state() accessor isDeleting = false
    @state() accessor disabled = false
    @state() accessor transactionId = ''
    @state() accessor commandId = ''
    @state() accessor partyId = ''
    @state() accessor txHash = ''
    @state() accessor tx = ''
    @state() accessor txParsed: ParsedTransactionInfo | null = null
    @state() accessor status = ''
    @state() accessor createdAt: string | null = null
    @state() accessor signedAt: string | null = null
    @state() accessor origin: string | null = null
    @state() accessor canSubmit = true
    @state() accessor walletCapabilityMessage: string | null = null

    @state() accessor externalTxId: string | null = null
    @state() accessor failureReason: string | null = null
    @state() accessor isSigning = false
    @state() accessor pollIntervalMs = 3000
    private pollTimer: ReturnType<typeof setTimeout> | null = null
    private pollDelay = 3000
    private polling = false

    connectedCallback(): void {
        super.connectedCallback()
        const url = new URL(window.location.href)
        this.transactionId = url.searchParams.get('transactionId') || ''
        this.pollDelay = this.pollIntervalMs
        document.addEventListener('visibilitychange', this.onVisibilityChange)
        void this.updateState()
    }

    disconnectedCallback(): void {
        super.disconnectedCallback()
        this.stopPolling()
        document.removeEventListener(
            'visibilitychange',
            this.onVisibilityChange
        )
    }

    private closeOrGoToList() {
        // Disable action buttons while leaving the page
        this.disabled = true
        const params = new URLSearchParams(window.location.search)
        // if approve view was triggered via dApp, close it after action
        // otherwise go back to activity list
        const shouldClose = params.has('closeafteraction')
        setTimeout(() => {
            if (shouldClose && window.opener) {
                window.close()
            } else {
                setLocationHref(toRelHref(ACTIVITIES_PAGE_REDIRECT))
            }
        }, 2000)
    }

    private async updateState() {
        const currentOrigin = await detectCurrentOrigin()
        const userClient = await createUserClient(
            await stateManager.accessToken.get(currentOrigin)
        )

        const result = await userClient.request({
            method: 'getTransaction',
            params: { transactionId: this.transactionId },
        })
        this.transactionId = result.id
        this.commandId = result.commandId
        this.txHash = result.preparedTransactionHash
        this.tx = result.preparedTransaction
        this.status = result.status
        this.createdAt = result.createdAt || null
        this.signedAt = result.signedAt || null
        this.origin = result.origin || null
        this.externalTxId = result.externalTxId || null
        this.failureReason = result.failureReason || null

        try {
            this.txParsed = parsePreparedTransaction(this.tx)
        } catch (error) {
            console.error('Error parsing prepared transaction:', error)
            this.txParsed = null
        }

        const wallets = await userClient.request({
            method: 'listWallets',
            params: {},
        })
        const primaryWallet = wallets.find((w) => w.primary === true)
        this.partyId = primaryWallet?.partyId || ''
        const rights = primaryWallet?.rights
        const submitCapable = !!(
            rights?.includes(PartyLevelRight.CanActAs) ||
            rights?.includes(PartyLevelRight.CanExecuteAs)
        )
        this.canSubmit = submitCapable
        this.walletCapabilityMessage = submitCapable
            ? null
            : 'The selected wallet is read-only for submission (no CanActAs/CanExecuteAs right).'

        this.syncPolling()
    }

    private onVisibilityChange = () => {
        if (document.hidden) {
            this.stopPolling()
        } else {
            this.pollDelay = this.pollIntervalMs
            this.syncPolling()
        }
    }

    private syncPolling() {
        if (this.status === 'awaiting-signature' && !document.hidden) {
            this.startPolling()
        } else {
            this.stopPolling()
        }
    }

    private startPolling() {
        if (this.pollTimer) return
        this.pollTimer = setTimeout(() => void this.poll(), this.pollDelay)
    }

    private stopPolling() {
        if (this.pollTimer) {
            clearTimeout(this.pollTimer)
            this.pollTimer = null
        }
    }

    private async poll() {
        this.pollTimer = null
        if (this.polling) return
        this.polling = true

        try {
            const currentOrigin = await detectCurrentOrigin()
            const userClient = await createUserClient(
                await stateManager.accessToken.get(currentOrigin)
            )
            const res: GetTransactionStatusResult = await userClient.request({
                method: 'getTransactionStatus',
                params: {
                    transactionId: this.transactionId,
                    partyId: this.partyId,
                },
            })

            if (res.status !== this.status) {
                this.pollDelay = this.pollIntervalMs
                await this.updateState()
                return
            }

            this.pollDelay = Math.min(
                this.pollDelay * 1.5,
                this.pollIntervalMs * 5
            )
        } catch (err) {
            console.error(err)
            this.pollDelay = Math.min(
                this.pollDelay * 2,
                this.pollIntervalMs * 10
            )
        } finally {
            this.polling = false
            this.syncPolling()
        }
    }

    private async handleApproveAction() {
        if (this.isSigning || this.isApproving) return

        if (this.status === 'signed') {
            return this.handleExecute()
        }

        if (this.status === 'awaiting-signature') {
            showToast(
                'Awaiting external signature',
                'Approval the request with your signing provider. This page will update automatically.',
                'info'
            )
            return
        }

        if (this.status !== 'pending') {
            return
        }

        return this.handleSign()
    }

    private async handleSign() {
        if (!this.canSubmit) {
            showToast(
                'Read-only wallet',
                'This wallet can read but not submit transactions',
                'error'
            )
            return
        }
        this.isSigning = true

        try {
            const currentOrigin = await detectCurrentOrigin()
            const userClient = await createUserClient(
                await stateManager.accessToken.get(currentOrigin)
            )
            const result: SignResult = await userClient.request({
                method: 'sign',
                params: {
                    transactionId: this.transactionId,
                    partyId: this.partyId,
                },
            })

            if (result.status === 'signed') {
                await this.updateState()
                return this.handleExecute()
            }
            await this.updateState()
        } catch (err) {
            console.error(err)
            handleErrorToast(err, { message: 'Error signing activity' })
            await this.updateState()
        } finally {
            this.isSigning = false
        }
    }

    private async handleExecute() {
        this.isApproving = true

        try {
            const currentOrigin = await detectCurrentOrigin()
            const userClient = await createUserClient(
                await stateManager.accessToken.get(currentOrigin)
            )
            await userClient.request({
                method: 'execute',
                params: {
                    transactionId: this.transactionId,
                    partyId: this.partyId,
                },
            })

            showToast('', 'Activity executed successfully', 'success')
            this.closeOrGoToList()
        } catch (err) {
            console.error(err)
            handleErrorToast(err, { message: 'Error submitting transaction' })
            await this.updateState()
        } finally {
            this.isApproving = false
        }
    }

    private async handleReject() {
        if (!confirm(`Reject pending activity "${this.commandId}"?`)) {
            return
        }

        this.isDeleting = true

        try {
            const currentOrigin = await detectCurrentOrigin()
            const userClient = await createUserClient(
                await stateManager.accessToken.get(currentOrigin)
            )
            await userClient.request({
                method: 'deleteTransaction',
                params: { transactionId: this.transactionId },
            })

            showToast('', 'Activity rejected successfully', 'success')
            this.closeOrGoToList()
        } catch (err) {
            console.error(err)
            handleErrorToast(err, { message: 'Error rejecting activity' })
            await this.updateState()
        } finally {
            this.isDeleting = false
        }
    }

    protected render() {
        return html`
            ${
                this.walletCapabilityMessage
                    ? html`<div class="alert alert-warning" role="alert">
                          ${this.walletCapabilityMessage}
                      </div>`
                    : ''
            }
            ${
                this.failureReason && this.status !== 'executed'
                    ? html`<div class="alert alert-warning" role="alert">
                          ${this.failureReason}
                      </div>`
                    : ''
            }
            <wg-transaction-detail
                .commandId=${this.commandId}
                .status=${this.status}
                .txHash=${this.txHash}
                .tx=${this.tx}
                .parsed=${this.txParsed}
                .createdAt=${this.createdAt}
                .signedAt=${this.signedAt}
                .origin=${this.origin}
                .externalTxId=${this.externalTxId}
                .backHref=${toRelHref(ACTIVITIES_PAGE_REDIRECT)}
                .isApproving=${this.isApproving}
                .isDeleting=${this.isDeleting}
                .isSigning=${this.isSigning}
                .disabled=${this.disabled}
                @transaction-approve=${this.handleApproveAction}
                @transaction-delete=${this.handleReject}
            ></wg-transaction-detail>
        `
    }
}
