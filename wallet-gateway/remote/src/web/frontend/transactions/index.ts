// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html, nothing } from 'lit'
import { customElement, state } from 'lit/decorators.js'

import { BaseElement } from '@canton-network/core-wallet-ui-components'

import { createUserClient } from '../rpc-client'

import '../index'
import { stateManager } from '../state-manager'
import {
    CommandId,
    Transaction,
} from '@canton-network/core-wallet-user-rpc-client'
import { parsePreparedTransaction, PreparedTransactionParsed } from './decode'

@customElement('user-ui-transactions')
export class UserUiTransactions extends BaseElement {
    @state()
    accessor transactions: Transaction[] = []

    @state()
    accessor parsedTransactions: Map<CommandId, PreparedTransactionParsed> =
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
                            <div class="card shadow-sm">
                                <div class="card-body">
                                    <h5
                                        class="card-title text-primary fw-semibold text-break"
                                    >
                                        ${tx.commandId}
                                    </h5>
                                    <p class="card-text text-muted text-break">
                                        <strong>Status:</strong>
                                        <span class="text-success">
                                            ${tx.status}
                                        </span>
                                        <br />
                                        <strong>Template:</strong>
                                        ${this.parsedTransactions.get(
                                            tx.commandId
                                        )?.packageName ||
                                        'N/A'}:${this.parsedTransactions.get(
                                            tx.commandId
                                        )?.moduleName ||
                                        'N/A'}:${this.parsedTransactions.get(
                                            tx.commandId
                                        )?.entityName || 'N/A'}
                                        <br />
                                        <strong>Signatories:</strong>
                                    </p>
                                    <ul>
                                        ${this.parsedTransactions
                                            .get(tx.commandId)
                                            ?.signatories?.map(
                                                (signatory) =>
                                                    html`<li>${signatory}</li>`
                                            ) || html`<li>N/A</li>`}
                                    </ul>
                                    <p class="card-text text-muted text-break">
                                        ${tx.createdAt
                                            ? html`<strong>Created At:</strong>
                                                  ${tx.createdAt}<br />`
                                            : nothing}
                                        ${tx.signedAt
                                            ? html`<strong>Signed At:</strong>
                                                  ${tx.signedAt}<br />`
                                            : nothing}
                                        ${tx.origin
                                            ? html`<strong>Origin:</strong>
                                                  ${tx.origin}`
                                            : nothing}
                                    </p>
                                    <div class="d-flex gap-2 mt-2">
                                        <button
                                            class="btn btn-sm btn-outline-secondary"
                                            @click=${() =>
                                                (window.location.href = `/approve/index.html?commandId=${tx.commandId}`)}
                                        >
                                            Review
                                        </button>
                                    </div>
                                </div>
                            </div>
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
}
