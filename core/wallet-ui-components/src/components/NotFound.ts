// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { BaseElement } from '../internal/BaseElement.js'

@customElement('not-found')
export class NotFound extends BaseElement {
    static styles = [
        BaseElement.styles,
        css`
            div,
            h1,
            h3 {
                text-align: center;
            }

            .btn {
                margin: 0 auto;
            }

            h1 {
                font-weight: 700;
                font-size: 110px;
                color: var(--bs-dark);
            }

            h3 {
                margin: 20px 0 30px;
            }
        `,
    ]

    @property({ type: String }) href: string = '/'

    render() {
        return html`
            <div>
                <h1>404</h1>
                <h3>
                    We are sorry, the page you are trying to view cannot be
                    found. It may have been moved or deleted.
                </h3>
                <button
                    type="button"
                    class="btn btn-secondary btn-lg"
                    @click=${() => (window.location.href = this.href)}
                >
                    Go to home page
                </button>
            </div>
        `
    }
}
