// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { chevronLeftIcon } from '../icons/index.js'
import { BaseElement } from '../internal/base-element.js'

@customElement('wg-back-link')
export class WgBackLink extends BaseElement {
    @property() href = ''

    @property() label = 'Back'

    static styles = [
        BaseElement.styles,
        css`
            :host {
                display: inline-flex;
                flex: 0 0 auto;
            }

            .back-link {
                display: inline-flex;
                align-items: center;
                gap: var(--wg-space-1);
                white-space: nowrap;
            }

            .icon {
                display: inline-flex;
                align-items: center;
            }
        `,
    ]

    render() {
        const content = html`
            <span class="icon">${chevronLeftIcon}</span>
            <span>${this.label}</span>
        `

        if (this.href) {
            return html`
                <a
                    class="back-link btn btn-link btn-sm text-body text-decoration-none p-0"
                    href=${this.href}
                >
                    ${content}
                </a>
            `
        }

        return html`
            <button
                class="back-link btn btn-link btn-sm text-body text-decoration-none p-0"
                type="button"
            >
                ${content}
            </button>
        `
    }
}
