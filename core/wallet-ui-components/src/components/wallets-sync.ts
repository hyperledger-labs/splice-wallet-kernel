// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { BaseElement } from '../internal/base-element'
import { refreshIcon } from '../icons'

export class WalletsSyncEvent extends Event {
    constructor() {
        super('wallets-sync', { bubbles: true, composed: true })
    }
}

/**
 * Refresh button for the parties list. It only reports clicks: the page does
 * the sync, shows the result and refreshes the wallets.
 */
@customElement('wg-wallets-sync')
export class WgWalletsSync extends BaseElement {
    static styles = [
        BaseElement.styles,
        css`
            :host {
                display: inline-flex;
                align-items: center;
                line-height: 1;
                vertical-align: middle;
            }

            .sync-button {
                border: none;
                background: transparent;
                color: var(--wg-text-secondary);
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 1.4rem;
                height: 1.4rem;
                padding: 0;
                line-height: 1;
                border-radius: var(--wg-radius-full);
                transition:
                    color 0.2s ease,
                    background-color 0.2s ease,
                    transform 0.2s ease;
            }

            .sync-button:hover:not(:disabled) {
                color: var(--wg-accent);
            }

            .sync-button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .sync-button.out-of-sync {
                color: var(--wg-accent);
            }

            .sync-icon {
                width: 0.9rem;
                height: 0.9rem;
                display: inline-flex;
                align-items: center;
                justify-content: center;
            }

            .sync-icon.spinning {
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                from {
                    transform: rotate(0deg);
                }
                to {
                    transform: rotate(360deg);
                }
            }
        `,
    ]

    /** Highlights the button to show that there are changes to sync */
    @property({ type: Boolean }) syncNeeded = false
    /** Shows a spinner and disables the button while a sync is in progress */
    @property({ type: Boolean }) syncing = false
    /** Disables the button, e.g. while there is no API client yet */
    @property({ type: Boolean }) disabled = false

    private onClick = () => {
        this.dispatchEvent(new WalletsSyncEvent())
    }

    protected render() {
        const title = this.syncing
            ? 'Syncing parties...'
            : this.syncNeeded
              ? 'Refresh parties (changes available)'
              : 'Refresh parties'

        return html`
            <button
                class="sync-button ${this.syncNeeded ? 'out-of-sync' : ''}"
                .disabled=${this.disabled || this.syncing}
                @click=${this.onClick}
                title=${title}
                aria-label=${title}
            >
                <span class="sync-icon ${this.syncing ? 'spinning' : ''}">
                    ${refreshIcon}
                </span>
            </button>
        `
    }
}
