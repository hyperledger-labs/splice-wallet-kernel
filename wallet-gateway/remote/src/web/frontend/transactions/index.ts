// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'

import {
    BaseElement,
    TransactionReviewEvent,
    handleErrorToast,
} from '@canton-network/core-wallet-ui-components'
import type { ParsedTransactionInfo } from '@canton-network/core-wallet-ui-components'

import { createUserClient } from '../rpc-client'

import '../index'
import { stateManager } from '../state-manager'
import {
    CommandId,
    Transaction,
} from '@canton-network/core-wallet-user-rpc-client'
import { parsePreparedTransaction } from './decode'

@customElement('user-ui-transactions')
export class UserUiTransactions extends BaseElement {
    @state()
    accessor transactions: Transaction[] = []

    @state()
    accessor parsedTransactions: Map<CommandId, ParsedTransactionInfo> =
        new Map()

    @state()
    accessor loading = false

    static styles = [
        BaseElement.styles,
        css`
            :host {
                display: block;
                max-width: 900px;
                margin: 0 auto;
            }
        `,
    ]

    protected render() {
        return html`
            <h1 class="mb-3">Transactions</h1>

            <div class="row g-3">
                ${this.transactions.map(
                    (tx) => html`
                        <div class="col-md-6 col-lg-4">
                            <wg-transaction-card
                                .commandId=${tx.commandId}
                                .status=${tx.status}
                                .parsed=${this.parsedTransactions.get(
                                    tx.commandId
                                ) || null}
                                .createdAt=${tx.createdAt ?? null}
                                .signedAt=${tx.signedAt ?? null}
                                .origin=${tx.origin ?? null}
                                @transaction-review=${this._onReview}
                            ></wg-transaction-card>
                        </div>
                    `
                )}
            </div>
        `
    }

    connectedCallback(): void {
        super.connectedCallback()
        this.updateTransactions()
    }

    private _onReview(e: TransactionReviewEvent) {
        window.location.href = `/approve/index.html?commandId=${e.commandId}`
    }

    private async updateTransactions() {
        const userClient = await createUserClient(
            stateManager.accessToken.get()
        )
        userClient.request({ method: 'listTransactions' }).then((result) => {
            this.transactions = result.transactions || []
            for (const tx of this.transactions) {
                try {
                    this.parsedTransactions.set(
                        tx.commandId,
                        parsePreparedTransaction(tx.preparedTransaction)
                    )
                } catch (error) {
                    console.error('Error parsing transaction:', error)
                }
            }
        })
    }

    private async handleDelete(tx: Transaction) {
        if (!confirm(`Delete pending transaction "${tx.commandId}"?`)) return
        try {
            const userClient = await createUserClient(
                stateManager.accessToken.get()
            )
            await userClient.request({
                method: 'deleteTransaction',
                params: { commandId: tx.commandId },
            })
            await this.updateTransactions()
        } catch (e) {
            handleErrorToast(e)
        }
    }
}
