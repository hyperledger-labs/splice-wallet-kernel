// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html, LitElement } from 'lit'
import { customElement } from 'lit/decorators.js'

@customElement('swk-configuration')
export class Configuration extends LitElement {
    protected render() {
        return html`
            <div>
                <h1>Configuration</h1>
                <p>Wallet Kernel configuration page.</p>
            </div>
        `
    }
}
