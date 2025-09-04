// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { LitElement, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'

@customElement('app-header')
export class AppHeader extends LitElement {
    @property({ type: String }) iconSrc: string = 'images/icon.png'

    // Prevent shadow DOM so external CSS applies
    createRenderRoot() {
        return this
    }

    render() {
        return html`
            <div
                class="header d-flex justify-content-between align-items-center"
            >
                <h2>
                    <div
                        class="logo-box"
                        @click=${() => (window.location.href = '/')}
                        aria-label="Go to home"
                    >
                        <img
                            src="${this.iconSrc}"
                            alt="Icon"
                            width="24"
                            height="24"
                        />
                        Splice Wallet
                    </div>
                </h2>
                <div>
                    <button
                        class="btn btn-outline-secondary btn-sm"
                        id="settingsButton"
                        @click=${() => (window.location.href = '/networks/')}
                    >
                        Settings
                    </button>
                    <button
                        class="btn btn-outline-secondary btn-sm"
                        @click=${() => {
                            localStorage.clear()
                            window.location.href = '/login'
                        }}
                        id="logoutButton"
                    >
                        Logout
                    </button>
                </div>
            </div>
        `
    }
}
