// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import '@canton-network/core-wallet-ui-components'
import {
    BaseElement,
    toRelHref,
} from '@canton-network/core-wallet-ui-components'
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
            }
        `,
    ]

    protected render() {
        return html`<not-found href=${toRelHref('/')}></not-found>`
    }
}
