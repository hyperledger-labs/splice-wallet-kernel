// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import {
    BaseElement,
    handleErrorToast,
    WgTransactionDetail,
} from '@canton-network/core-wallet-ui-components'
import type { ParsedTransactionInfo } from '@canton-network/core-wallet-ui-components'
import { createUserClient } from '../rpc-client'
import { stateManager } from '../state-manager'
import '../index'
import { parsePreparedTransaction } from '../transactions/decode'

@customElement('user-ui-approve')
export class ApproveUi extends BaseElement {
    @state() accessor loading = false
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
        const params = new URLSearchParams(window.location.search)
        // if tx approve view was triggered via dApp, close it after approve or delete
        // otherwise go back to tx list
        const shouldClose = params.has('closeafteraction')
        setTimeout(() => {
            if (shouldClose && window.opener) {
                window.close()
            } else {
                window.location.href = '/transactions/index.html'
            }
        }, 1000)
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
        this.loading = true
        try {
            const userClient = await createUserClient(
                stateManager.accessToken.get()
            )
            await userClient.request({
                method: 'deleteTransaction',
                params: { commandId: this.commandId },
            })

            this.message = 'Transaction deleted successfully ✅'
            this.messageType = 'info'
            // This prevents folks from clicking delete twice
            this.status = ''

            this.closeOrGoToList()
        } catch (e) {
            handleErrorToast(e)
        } finally {
            this.loading = false
        }
    }

    private async handleApprove() {
        this.loading = true
        const detail = this._detailComponent
        if (detail) {
            detail.message = 'Executing transaction...'
            detail.messageType = 'info'
        }

        try {
            const userClient = await createUserClient(
                stateManager.accessToken.get()
            )
            const { signature, signedBy } = await userClient.request({
                method: 'sign',
                params: {
                    commandId: this.commandId,
                    partyId: this.partyId,
                    preparedTransactionHash: this.txHash,
                    preparedTransaction: this.tx,
                },
            })

            await userClient.request({
                method: 'execute',
                params: {
                    signature,
                    signedBy,
                    commandId: this.commandId,
                    partyId: this.partyId,
                },
            })

            this.status = 'executed'
            if (detail) {
                detail.message = 'Transaction executed successfully \u2705'
                detail.messageType = 'info'
            }

            this.closeOrGoToList()
        } catch (err) {
            console.error(err)
            if (detail) {
                detail.message = null
                detail.messageType = null
            }
            handleErrorToast(err, { message: 'Error executing transaction' })
        } finally {
            this.loading = false
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
                ?loading=${this.loading}
                @transaction-approve=${this.handleApprove}
            ></wg-transaction-detail>
        `
    }
}
