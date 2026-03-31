// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'

import {
    BaseElement,
    NetworkCardReviewEvent,
    PageChangeEvent,
    handleErrorToast,
    toRelPath,
} from '@canton-network/core-wallet-ui-components'

import { Network, Session } from '@canton-network/core-wallet-user-rpc-client'

import { createUserClient } from '../rpc-client'
import '../index'
import { stateManager } from '../state-manager'

@customElement('user-ui-networks')
export class UserUiNetworks extends BaseElement {
    @state() accessor networks: Network[] = []
    @state() accessor sessions: Session[] = []
    @state() accessor isAdmin = false
    @state() accessor currentPage = 1

    private readonly pageSize = 3

    static styles = [
        BaseElement.styles,
        css`
            :host {
                display: block;
                max-width: 900px;
                margin: 0 auto;
            }

            .page-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: var(--wg-space-3);
                margin-bottom: var(--wg-space-4);
            }

            .network-list {
                display: flex;
                flex-direction: column;
                gap: var(--wg-space-4);
            }

            .pagination-wrap {
                margin-top: var(--wg-space-8);
                display: flex;
                justify-content: center;
            }

            .btn-add {
                padding: 0.45rem 1.1rem;
            }
        `,
    ]

    private get pagedNetworks() {
        const start = (this.currentPage - 1) * this.pageSize
        return this.networks.slice(start, start + this.pageSize)
    }

    async connectedCallback(): Promise<void> {
        super.connectedCallback()
        await this.loadData()
    }

    private async loadData() {
        try {
            const userClient = await createUserClient(
                stateManager.accessToken.get()
            )
            const [networksResult, sessionsResult, userResult] =
                await Promise.all([
                    userClient.request({ method: 'listNetworks' }),
                    userClient
                        .request({ method: 'listSessions' })
                        .catch(() => ({ sessions: [] })),
                    userClient
                        .request({ method: 'getUser' })
                        .catch(() => ({ userId: '', isAdmin: false })),
                ])

            this.networks = networksResult.networks
            this.sessions = sessionsResult.sessions
            this.isAdmin = userResult.isAdmin

            const maxPage = Math.max(
                1,
                Math.ceil(this.networks.length / this.pageSize)
            )
            if (this.currentPage > maxPage) {
                this.currentPage = maxPage
            }
        } catch (error) {
            handleErrorToast(error)
        }
    }

    private _onReview(e: NetworkCardReviewEvent) {
        window.location.href = `${toRelPath('/networks/review/')}?id=${encodeURIComponent(e.network.id)}`
    }

    private _onPageChange(e: PageChangeEvent) {
        this.currentPage = e.page
    }

    protected render() {
        return html`
            <div class="page-header">
                <h1 class="h4 fw-semibold mb-0">Networks</h1>

                ${this.isAdmin
                    ? html`
                          <button
                              class="btn btn-primary btn-sm rounded-pill btn-add"
                              type="button"
                              @click=${() =>
                                  (window.location.href =
                                      toRelPath('/networks/add/'))}
                          >
                              <span aria-hidden="true">+</span>
                              New
                          </button>
                      `
                    : ''}
            </div>

            ${this.networks.length === 0
                ? html`<p class="mb-0 text-body-secondary">
                      No networks configured.
                  </p>`
                : html`
                      <div class="network-list">
                          ${this.pagedNetworks.map((network) => {
                              const session = this.sessions.find(
                                  (s) => s.network.id === network.id
                              )
                              return html`
                                  <network-card
                                      .network=${network}
                                      .activeSession=${!!session}
                                      .accessToken=${session?.accessToken ?? ''}
                                      .readonly=${!this.isAdmin}
                                      @network-review=${this._onReview}
                                  ></network-card>
                              `
                          })}
                      </div>

                      ${this.networks.length > this.pageSize
                          ? html`
                                <div class="pagination-wrap">
                                    <wg-pagination
                                        .total=${this.networks.length}
                                        .pageSize=${this.pageSize}
                                        .page=${this.currentPage}
                                        @page-change=${this._onPageChange}
                                    ></wg-pagination>
                                </div>
                            `
                          : ''}
                  `}
        `
    }
}
