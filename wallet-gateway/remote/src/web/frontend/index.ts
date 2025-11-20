// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html, LitElement } from 'lit'
import { customElement } from 'lit/decorators.js'
import { createUserClient } from './rpc-client'

import '@canton-network/core-wallet-ui-components'
import '@canton-network/core-wallet-ui-components/dist/index.css'
import '/index.css'
import { stateManager } from './state-manager'
import { WalletEvent } from '@canton-network/core-types'

const DEFAULT_PAGE_REDIRECT = '/wallets'
const NOT_FOUND_PAGE_REDIRECT = '/404'
const LOGIN_PAGE_REDIRECT = '/login'
const ALLOWED_ROUTES = ['/login/', '/wallets/', '/settings/', '/approve/', '/']

@customElement('user-app')
export class UserApp extends LitElement {
    private async handleLogout() {
        console.log('Handling logout...')
        localStorage.clear()

        const userClient = createUserClient(stateManager.accessToken.get())
        await userClient.request('removeSession')

        if (
            window.name === 'wallet-popup' &&
            window.opener &&
            !window.opener.closed
        ) {
            // close the gateway UI automatically if we are within a popup
            window.close()
        } else {
            // if the gateway UI is running in the main window, redirect to login
            window.location.href = LOGIN_PAGE_REDIRECT
        }
    }

    protected render() {
        return html`
            <app-layout
                iconSrc="/icon.png"
                @logout=${this.handleLogout}
                @some=${() => {
                    alert('Some event received')
                }}
            >
                <user-ui-auth-redirect></user-ui-auth-redirect>
                <slot></slot>
            </app-layout>
        `
    }
}

@customElement('user-ui')
export class UserUI extends LitElement {
    connectedCallback(): void {
        super.connectedCallback()

        if (!ALLOWED_ROUTES.includes(window.location.pathname)) {
            alert(`Redirecting to not found page: ${window.location.pathname}`)
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

        const accessToken = stateManager.accessToken.get()
        if (accessToken && isLoginPage) {
            const networkId = stateManager.networkId.get()

            if (!networkId) {
                throw new Error('missing networkId in state manager')
            }

            authenticate(accessToken, networkId)

            window.location.href = DEFAULT_PAGE_REDIRECT
        }
    }
}

export const authenticate = async (
    accessToken: string,
    networkId: string
): Promise<void> => {
    const authenticatedUserClient = createUserClient(accessToken)
    await authenticatedUserClient.request('addSession', {
        networkId,
    })

    if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
            {
                type: WalletEvent.SPLICE_WALLET_IDP_AUTH_SUCCESS,
                token: stateManager.accessToken.get(),
            },
            '*'
        )
    }
}
