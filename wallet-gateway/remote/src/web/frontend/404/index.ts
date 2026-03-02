// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import '@canton-network/core-wallet-ui-components'
import { BaseElement } from '@canton-network/core-wallet-ui-components'
import { html, css } from 'lit'
import { customElement } from 'lit/decorators.js'
import '../index'

@customElement('user-ui-404')
export class NotFoundUi extends BaseElement {
    static styles = [
        BaseElement.styles,
        css`
            :host {
                display: block;
                max-width: 900px;
                margin: 20% auto;
                padding: 20px;
            }
        `,
    ]

    protected render() {
        return html`<not-found href="/"></not-found>`
    }
}
