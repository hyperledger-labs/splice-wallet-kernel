// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { LitElement } from 'lit'
import { customElement } from 'lit/decorators.js'

import '@canton-network/core-wallet-ui-components'
import '@canton-network/core-wallet-ui-components/dist/index.css'
import '/index.css'
import { stateManager } from './state-manager'

const DEFAULT_PAGE_REDIRECT = '/wallets'
const NOT_FOUND_PAGE_REDIRECT = '/404'
const LOGIN_PAGE_REDIRECT = '/login'
const ALLOWED_ROUTES = ['/wallets', '/networks', '/approve', '/']

@customElement('user-ui')
export class UserUI extends LitElement {
    connectedCallback(): void {
        super.connectedCallback()

        if (!ALLOWED_ROUTES.includes(window.location.pathname)) {
            window.location.href = NOT_FOUND_PAGE_REDIRECT
        } else {
            window.location.href = DEFAULT_PAGE_REDIRECT
        }
    }
}

@customElement('user-ui-auth-redirect')
export class UserUIAuthRedirect extends LitElement {
    connectedCallback(): void {
        super.connectedCallback()

        const isLoginPage =
            window.location.pathname.startsWith(LOGIN_PAGE_REDIRECT)
        const expirationDate = new Date(stateManager.expirationDate.get() || '')
        const now = new Date()

        if (expirationDate > now) {
            setTimeout(() => {
                localStorage.clear()
                window.location.href = LOGIN_PAGE_REDIRECT
            }, expirationDate.getTime() - now.getTime())
        } else if (stateManager.accessToken.get()) {
            localStorage.clear()
            window.location.href = LOGIN_PAGE_REDIRECT
        }

        if (!stateManager.accessToken.get() && !isLoginPage) {
            window.location.href = LOGIN_PAGE_REDIRECT
        }

        if (stateManager.accessToken.get() && isLoginPage) {
            window.location.href = DEFAULT_PAGE_REDIRECT
        }
    }
}
