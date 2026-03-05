// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import {
    BaseElement,
    handleErrorToast,
    WgTransactionDetail,
    toRelHref,
} from '@canton-network/core-wallet-ui-components'
import {
    ParsedTransactionInfo,
    parsePreparedTransaction,
} from '@canton-network/core-tx-visualizer'
import { createUserClient } from '../rpc-client'
import { stateManager } from '../state-manager'
import '../index'
import { TRANSACTIONS_PAGE_REDIRECT } from '../constants'
import { showToast } from '../utils'
import { SignResult } from '@canton-network/core-wallet-user-rpc-client'
// import { SignResult } from

@customElement('user-ui-approve')
export class ApproveUi extends BaseElement {
    @state() accessor isApproving: boolean = false
    @state() accessor isDeleting: boolean = false
    @state() accessor disabled: boolean = false
    @state() accessor commandId = ''
    @state() accessor partyId = ''
    @state() accessor txHash = ''
    @state() accessor tx = ''
    @state() accessor txParsed: ParsedTransactionInfo | null = null
    @state() accessor status = ''
    @state() accessor message: string | null = null
    @state() accessor messageType: 'info' | 'error' | null = null
    @state() accessor createdAt: string | null = null
    @state() accessor signedAt: string | null = null
    @state() accessor origin: string | null = null

    connectedCallback(): void {
        super.connectedCallback()
        const url = new URL(window.location.href)
        this.commandId = url.searchParams.get('commandId') || ''
        this.updateState()
    }

    private closeOrGoToList() {
        // Disable action buttons while leaving the page
        this.disabled = true
        const params = new URLSearchParams(window.location.search)
        // if tx approve view was triggered via dApp, close it after approve or delete
        // otherwise go back to tx list
        const shouldClose = params.has('closeafteraction')
        setTimeout(() => {
            if (shouldClose && window.opener) {
                window.close()
            } else {
                window.location.href = toRelHref(TRANSACTIONS_PAGE_REDIRECT)
            }
        }, 2000)
    }

    private async updateState() {
        const userClient = await createUserClient(
            stateManager.accessToken.get()
        )
        userClient
            .request({
                method: 'getTransaction',
                params: { commandId: this.commandId },
            })
            .then((result) => {
                this.txHash = result.preparedTransactionHash
                this.tx = result.preparedTransaction
                this.status = result.status
                this.createdAt = result.createdAt || null
                this.signedAt = result.signedAt || null
                this.origin = result.origin || null
                try {
                    this.txParsed = parsePreparedTransaction(this.tx)
                } catch (error) {
                    console.error('Error parsing prepared transaction:', error)
                    this.txParsed = null
                }
            })

        userClient
            .request({ method: 'listWallets', params: {} })
            .then((wallets) => {
                this.partyId =
                    wallets.find((w) => w.primary === true)?.partyId || ''
            })
    }

    private get _detailComponent(): WgTransactionDetail | null {
        return this.renderRoot.querySelector<WgTransactionDetail>(
            'wg-transaction-detail'
        )
    }

    private async handleDelete() {
        if (!confirm(`Delete pending transaction "${this.commandId}"?`)) return
        this.isDeleting = true
        try {
            const userClient = await createUserClient(
                stateManager.accessToken.get()
            )
            await userClient.request({
                method: 'deleteTransaction',
                params: { commandId: this.commandId },
            })

            showToast('', 'Transaction deleted successfully', 'success')
            this.closeOrGoToList()
        } catch (e) {
            handleErrorToast(e)
        } finally {
            this.isDeleting = false
        }
    }

    private async handleApprove() {
        this.isApproving = true

        try {
            const userClient = await createUserClient(
                stateManager.accessToken.get()
            )
            const result: SignResult = await userClient.request({
                method: 'sign',
                params: {
                    commandId: this.commandId,
                    partyId: this.partyId,
                    preparedTransactionHash: this.txHash,
                    preparedTransaction: this.tx,
                },
            })

            if (result.status === 'pending') {
                showToast(
                    'Transaction Pending',
                    'Complete the signing in your external provider, then click Approve to finish.',
                    'info'
                )
                return
            }

            if (result.status === 'signed') {
                await userClient.request({
                    method: 'execute',
                    params: {
                        signature: result.signature,
                        signedBy: result.signedBy,
                        commandId: this.commandId,
                        partyId: this.partyId,
                    },
                })

                showToast('', 'Transaction executed successfully', 'success')
                this.closeOrGoToList()
            }

            // TODO result status failed / rejected
        } catch (err) {
            console.error(err)
            handleErrorToast(err, { message: 'Error executing transaction' })
        } finally {
            this.isApproving = false
        }
    }

    protected render() {
        return html`
            <wg-transaction-detail
                .commandId=${this.commandId}
                .status=${this.status}
                .txHash=${this.txHash}
                .tx=${this.tx}
                .parsed=${this.txParsed}
                .createdAt=${this.createdAt}
                .signedAt=${this.signedAt}
                .origin=${this.origin}
                .isApproving=${this.isApproving}
                .isDeleting=${this.isDeleting}
                .disabled=${this.disabled}
                @transaction-approve=${this.handleApprove}
                @transaction-delete=${this.handleDelete}
            ></wg-transaction-detail>
        `
    }
}
