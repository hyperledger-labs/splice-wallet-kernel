// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { BaseElement } from '../internal/base-element'
import { arrowLeftIcon, refreshIcon, warningTriangleIcon } from '../icons'
import { toRelPath } from '../routing'

export type ErrorPageMode = 'back' | 'refresh'

export class ErrorPageBackEvent extends Event {
    constructor() {
        super('error-back', { bubbles: true, composed: true })
    }
}

export class ErrorPageRefreshEvent extends Event {
    constructor() {
        super('error-refresh', { bubbles: true, composed: true })
    }
}

@customElement('wg-error-page')
export class WgErrorPage extends BaseElement {
    @property({ type: String }) mode: ErrorPageMode = 'back'
    @property({ type: String }) title = 'Something went wrong'
    @property({ type: String }) message =
        'An unexpected error occurred while loading this page.'
    @property({ type: String }) backHref = '/'
    @property({ type: Boolean }) performDefaultAction = true

    static styles = [
        BaseElement.styles,
        css`
            :host {
                display: block;
            }

            .error-page {
                min-height: 280px;
                display: grid;
                place-items: center;
                text-align: center;
                padding: var(--wg-space-8) var(--wg-space-4);
                color: var(--wg-text);
            }

            .error-card {
                width: min(560px, 100%);
                background: var(--wg-surface);
                border: 1px solid var(--wg-border);
                border-radius: var(--wg-radius-xl);
                box-shadow: var(--wg-shadow-md);
                padding: var(--wg-space-8);
            }

            .error-icon {
                color: var(--wg-error);
                display: inline-flex;
                margin-bottom: var(--wg-space-3);
            }

            h1 {
                margin: 0;
                font-size: var(--wg-font-size-2xl);
                font-weight: var(--wg-font-weight-bold);
                line-height: var(--wg-line-height-tight);
            }

            p {
                margin: var(--wg-space-3) 0 var(--wg-space-6);
                color: var(--wg-text-secondary);
                font-size: var(--wg-font-size-base);
            }

            .action-btn {
                border: none;
                border-radius: var(--wg-radius-full);
                display: inline-flex;
                align-items: center;
                gap: var(--wg-space-2);
                padding: 0.55rem 1rem;
                font-size: var(--wg-font-size-sm);
                font-weight: var(--wg-font-weight-semibold);
                cursor: pointer;
                color: var(--wg-accent);
                background: rgba(124, 58, 237, 0.1);
                transition: background-color 0.2s ease;
            }

            .action-btn:hover {
                background: rgba(124, 58, 237, 0.16);
            }
        `,
    ]

    private onBack() {
        this.dispatchEvent(new ErrorPageBackEvent())
        if (this.performDefaultAction) {
            window.location.href = toRelPath(this.backHref)
        }
    }

    private onRefresh() {
        this.dispatchEvent(new ErrorPageRefreshEvent())
        if (this.performDefaultAction) {
            window.location.reload()
        }
    }

    render() {
        return html`
            <section class="error-page">
                <article class="error-card" role="alert" aria-live="polite">
                    <div class="error-icon">${warningTriangleIcon}</div>
                    <h1>${this.title}</h1>
                    <p>${this.message}</p>
                    ${this.mode === 'refresh'
                        ? html`<button
                              type="button"
                              class="action-btn"
                              @click=${this.onRefresh}
                          >
                              ${refreshIcon} Refresh
                          </button>`
                        : html`<button
                              type="button"
                              class="action-btn"
                              @click=${this.onBack}
                          >
                              ${arrowLeftIcon} Back
                          </button>`}
                </article>
            </section>
        `
    }
}
