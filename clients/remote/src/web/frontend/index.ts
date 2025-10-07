// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { LitElement } from 'lit'
import { customElement } from 'lit/decorators.js'

import '@canton-network/core-wallet-ui-components'
import '/index.css'
import { stateManager } from './state-manager'

const DEFAULT_PAGE_REDIRECT = '/wallets'

@customElement('user-ui')
export class UserUI extends LitElement {
    connectedCallback(): void {
        super.connectedCallback()

        window.location.href = DEFAULT_PAGE_REDIRECT
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
