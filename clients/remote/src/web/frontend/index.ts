// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html, LitElement } from 'lit'
import { customElement } from 'lit/decorators.js'

import '@canton-network/core-wallet-ui-components'
import '/style.css'
import { stateManager } from './state-manager'

@customElement('user-ui')
export class UserUI extends LitElement {
    protected render() {
        return html`<div>
            <h1>Home</h1>
            <swk-configuration></swk-configuration>
        </div>`
    }
}

@customElement('user-ui-auth-redirect')
export class UserUIAuthRedirect extends LitElement {
    connectedCallback(): void {
        super.connectedCallback()

        if (!stateManager.accessToken.get()) {
            window.location.href = '/login/'
        }
    }
}
