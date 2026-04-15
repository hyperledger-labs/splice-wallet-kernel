// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { BaseElement } from '../internal/base-element'

@customElement('wg-loading-state')
export class WgLoadingState extends BaseElement {
    @property({ type: String }) text = 'Loading'

    static styles = [
        BaseElement.styles,
        css`
            :host {
                display: block;
            }

            .loading-wrap {
                min-height: 180px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                gap: var(--wg-space-3);
                color: var(--wg-text);
                text-align: center;
                padding: var(--wg-space-6) var(--wg-space-4);
            }

            .dots {
                display: inline-flex;
                gap: var(--wg-space-2);
                align-items: center;
                justify-content: center;
            }

            .dot {
                width: 0.5rem;
                height: 0.5rem;
                border-radius: var(--wg-radius-full);
                background: var(--wg-accent);
                animation: bounce 1s infinite ease-in-out;
            }

            .dot:nth-child(2) {
                animation-delay: 0.15s;
            }

            .dot:nth-child(3) {
                animation-delay: 0.3s;
            }

            .loading-text {
                margin: 0;
                font-size: var(--wg-font-size-base);
                color: var(--wg-text-secondary);
                font-weight: var(--wg-font-weight-medium);
            }

            @keyframes bounce {
                0%,
                80%,
                100% {
                    transform: scale(0.7);
                    opacity: 0.4;
                }
                40% {
                    transform: scale(1);
                    opacity: 1;
                }
            }
        `,
    ]

    render() {
        return html`
            <div class="loading-wrap" role="status" aria-live="polite">
                <div class="dots" aria-hidden="true">
                    <span class="dot"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>
                </div>
                <p class="loading-text">${this.text}</p>
            </div>
        `
    }
}
