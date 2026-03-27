// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'

import {
    BaseElement,
    IdpCardReviewEvent,
    PageChangeEvent,
    handleErrorToast,
    toRelPath,
} from '@canton-network/core-wallet-ui-components'

import { Idp } from '@canton-network/core-wallet-user-rpc-client'

import { createUserClient } from '../rpc-client'
import '../index'
import { stateManager } from '../state-manager'

@customElement('user-ui-identity-providers')
export class UserUiIdentityProviders extends BaseElement {
    @state() accessor idps: Idp[] = []
    @state() accessor isAdmin = false
    @state() accessor currentPage = 1

    private readonly pageSize = 4

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

            .idp-list {
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

    private get pagedIdps() {
        const start = (this.currentPage - 1) * this.pageSize
        return this.idps.slice(start, start + this.pageSize)
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
            const [idpsResult, userResult] = await Promise.all([
                userClient.request({ method: 'listIdps' }),
                userClient
                    .request({ method: 'getUser' })
                    .catch(() => ({ userId: '', isAdmin: false })),
            ])

            this.idps = idpsResult.idps
            this.isAdmin = userResult.isAdmin

            const maxPage = Math.max(
                1,
                Math.ceil(this.idps.length / this.pageSize)
            )
            if (this.currentPage > maxPage) {
                this.currentPage = maxPage
            }
        } catch (error) {
            handleErrorToast(error)
        }
    }

    private _onReview(e: IdpCardReviewEvent) {
        window.location.href = `${toRelPath('/identity-providers/review/')}?id=${encodeURIComponent(e.idp.id)}`
    }

    private _onPageChange(e: PageChangeEvent) {
        this.currentPage = e.page
    }

    protected render() {
        return html`
            <div class="page-header">
                <h1 class="h4 fw-semibold mb-0">Identity Providers</h1>

                ${this.isAdmin
                    ? html`
                          <button
                              class="btn btn-primary btn-sm rounded-pill btn-add"
                              type="button"
                              @click=${() =>
                                  (window.location.href = toRelPath(
                                      '/identity-providers/add/'
                                  ))}
                          >
                              <span aria-hidden="true">+</span>
                              New
                          </button>
                      `
                    : ''}
            </div>

            ${this.idps.length === 0
                ? html`<p class="mb-0 text-body-secondary">
                      No identity providers configured.
                  </p>`
                : html`
                      <div class="idp-list">
                          ${this.pagedIdps.map(
                              (idp) => html`
                                  <idp-card
                                      .idp=${idp}
                                      .readonly=${!this.isAdmin}
                                      @idp-review=${this._onReview}
                                  ></idp-card>
                              `
                          )}
                      </div>

                      ${this.idps.length > this.pageSize
                          ? html`
                                <div class="pagination-wrap">
                                    <wg-pagination
                                        .total=${this.idps.length}
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
