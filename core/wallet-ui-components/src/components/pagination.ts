// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { BaseElement } from '../internal/base-element'
import { arrowLeftIcon, arrowRightIcon } from '../icons'

export class PageChangeEvent extends CustomEvent<{ page: number }> {
    constructor(page: number) {
        super('page-change', {
            bubbles: true,
            composed: true,
            detail: { page },
        })
    }

    get page() {
        return this.detail.page
    }
}

@customElement('wg-pagination')
export class WgPagination extends BaseElement {
    @property({ type: Number }) total = 0
    @property({ type: Number }) pageSize = 5
    @property({ type: Number }) page = 1

    static styles = [
        BaseElement.styles,
        css`
            :host {
                display: inline-flex;
                align-items: center;
                gap: var(--wg-space-2);
                color: var(--wg-primary);
            }

            .pagination {
                display: inline-flex;
                align-items: center;
                gap: var(--wg-space-2);
                font-size: var(--wg-font-size-sm);
                font-weight: var(--wg-font-weight-medium);
                color: var(--wg-primary);
                user-select: none;
            }

            .page-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 1.6rem;
                height: 1.6rem;
                border: none;
                border-radius: var(--wg-radius-full);
                background: transparent;
                color: var(--wg-primary);
                cursor: pointer;
                transition:
                    opacity 0.2s ease,
                    color 0.2s ease;
            }

            .page-btn:hover:not(:disabled) {
                opacity: 0.75;
            }

            .page-btn:disabled {
                opacity: 0.4;
                cursor: not-allowed;
            }
        `,
    ]

    private get maxPage() {
        return Math.max(1, Math.ceil(this.total / Math.max(this.pageSize, 1)))
    }

    private get range() {
        if (this.total <= 0) {
            return { start: 0, end: 0 }
        }

        const start = (this.page - 1) * this.pageSize + 1
        const end = Math.min(start + this.pageSize - 1, this.total)
        return { start, end }
    }

    private updatePage(nextPage: number) {
        const clamped = Math.min(Math.max(nextPage, 1), this.maxPage)
        if (clamped === this.page) {
            return
        }

        this.page = clamped
        this.dispatchEvent(new PageChangeEvent(clamped))
    }

    protected willUpdate() {
        if (this.pageSize < 1) {
            this.pageSize = 1
        }

        if (this.page < 1) {
            this.page = 1
        }

        if (this.page > this.maxPage) {
            this.page = this.maxPage
        }
    }

    render() {
        const { start, end } = this.range
        const atFirstPage = this.page <= 1
        const atLastPage = this.page >= this.maxPage

        return html`
            <div class="pagination" aria-label="Pagination">
                <button
                    class="page-btn"
                    .disabled=${atFirstPage}
                    @click=${() => this.updatePage(this.page - 1)}
                    aria-label="Previous page"
                >
                    ${arrowLeftIcon}
                </button>
                <span>${start}-${end} of ${this.total}</span>
                <button
                    class="page-btn"
                    .disabled=${atLastPage}
                    @click=${() => this.updatePage(this.page + 1)}
                    aria-label="Next page"
                >
                    ${arrowRightIcon}
                </button>
            </div>
        `
    }
}
