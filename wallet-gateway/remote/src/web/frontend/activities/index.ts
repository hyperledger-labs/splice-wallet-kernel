// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'

import {
    BaseElement,
    type PageChangeEvent,
    type TransactionCardReviewEvent,
    handleErrorToast,
    toRelHref,
} from '@canton-network/core-wallet-ui-components'
import {
    type ParsedTransactionInfo,
    parsePreparedTransaction,
} from '@canton-network/core-tx-visualizer'

import { createUserClient } from '../rpc-client'
import { setLocationHref } from '../navigation.js'

import '../index'
import { stateManager } from '../state-manager'
import type { Transaction } from '@canton-network/core-wallet-user-rpc-client'
import { detectCurrentOrigin } from '../listeners.js'

@customElement('user-ui-activities')
export class UserUiActivities extends BaseElement {
    @state()
    accessor transactions: Transaction[] = []

    @state()
    accessor parsedTransactions: Map<string, ParsedTransactionInfo | null> =
        new Map()

    @state()
    accessor loading = false

    @state()
    accessor currentPage = 1

    @state()
    accessor totalTransactionCount = 0

    private pageCursors: (string | undefined)[] = [undefined]

    private readonly pageSize = 4

    static styles = [
        BaseElement.styles,
        css`
            :host {
                display: block;
                max-width: 900px;
                margin: 0 auto;
            }

            .activity-list {
                display: flex;
                flex-direction: column;
                gap: var(--wg-space-4);
            }

            .page-header {
                margin-bottom: var(--wg-space-4);
            }

            .pagination-wrap {
                margin-top: var(--wg-space-8);
                display: flex;
                justify-content: center;
            }
        `,
    ]

    protected render() {
        return html`
            <div class="page-header">
                <h1 class="h4 fw-semibold mb-0 text-body">Activities</h1>
            </div>

            ${
                this.loading && !this.transactions.length
                    ? html`<p class="mb-0 text-body-secondary">
                          Loading activities...
                      </p>`
                    : this.transactions.length
                      ? html`
                            <div class="activity-list">
                                ${this.transactions.map(
                                    (tx) => html`
                                        <wg-transaction-card
                                            .transactionId=${tx.id}
                                            .commandId=${tx.commandId}
                                            .externalTxId=${tx.externalTxId ?? null}
                                            .status=${tx.status}
                                            .parsed=${
                                                this.parsedTransactions.get(
                                                    tx.id
                                                ) || null
                                            }
                                            .createdAt=${tx.createdAt ?? null}
                                            .signedAt=${tx.signedAt ?? null}
                                            .origin=${tx.origin ?? null}
                                            .loading=${this.loading}
                                            @transaction-review=${this._onReview}
                                        ></wg-transaction-card>
                                    `
                                )}
                            </div>

                            ${
                                this.totalTransactionCount > this.pageSize
                                    ? html`
                                          <div class="pagination-wrap">
                                              <wg-pagination
                                                  .total=${this.totalTransactionCount}
                                                  .pageSize=${this.pageSize}
                                                  .page=${this.currentPage}
                                                  @page-change=${this._onPageChange}
                                              ></wg-pagination>
                                          </div>
                                      `
                                    : ''
                            }
                        `
                      : html`<p class="mb-0 text-body-secondary">
                            No activities yet.
                        </p>`
            }
        `
    }

    connectedCallback(): void {
        super.connectedCallback()
        void this.updateTransactions()
    }

    private _onReview(e: TransactionCardReviewEvent) {
        const approveHref = toRelHref('/approve')
        setLocationHref(`${approveHref}?transactionId=${e.transactionId}`)
    }

    private _onPageChange(e: PageChangeEvent) {
        const targetPage = e.detail.page
        if (targetPage === this.currentPage || targetPage < 1) return
        this.currentPage = targetPage
        void this.updateTransactions()
    }

    private async updateTransactions() {
        this.loading = true
        try {
            const currentOrigin = await detectCurrentOrigin()
            const userClient = await createUserClient(
                await stateManager.accessToken.get(currentOrigin)
            )

            const currentCursor = this.pageCursors[this.currentPage - 1]

            const result = await userClient.request({
                method: 'listTransactions',
                params: {
                    limit: this.pageSize,
                    ...(currentCursor !== undefined
                        ? { cursor: currentCursor }
                        : {}),
                },
            })
            this.transactions = result.transactions || []

            this.totalTransactionCount = result.count ?? 0

            if (result.nextCursor) {
                this.pageCursors[this.currentPage] = result.nextCursor
            }

            this.parsedTransactions = new Map(
                this.transactions.map((tx) => {
                    try {
                        return [
                            tx.id,
                            parsePreparedTransaction(tx.preparedTransaction),
                        ] as const
                    } catch (error) {
                        console.error('Error parsing transaction:', error)
                        return [tx.id, null] as const
                    }
                })
            )
        } catch (error) {
            handleErrorToast(error)
        } finally {
            this.loading = false
        }
    }
}
