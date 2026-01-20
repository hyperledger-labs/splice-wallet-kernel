// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import '@canton-network/core-wallet-ui-components'
import { html, css, LitElement } from 'lit'
import { customElement } from 'lit/decorators.js'
import '/index.css'
import '../index'

@customElement('user-ui-404')
export class ApproveUi extends LitElement {
    static styles = css`
        :host {
            display: block;
            box-sizing: border-box;
            padding: 0rem;
            max-width: 900px;
            margin: 20% auto;
            font-family: var(--swk-font, Arial, sans-serif);
            color: var(--text-color, #222);
            padding: 20px;
        }
    `

    connectedCallback(): void {
        super.connectedCallback()
    }

    protected render() {
        return html`
            <div class="wrapper">
                <not-found href="/"></not-found>
            </div>
        `
    }
}
