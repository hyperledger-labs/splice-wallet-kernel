// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import defaultTheme from '../../themes/default.css?inline'
import { BaseElement } from '../internal/base-element'

@customElement('app-layout')
export class AppLayout extends BaseElement {
    @property({ type: String }) iconSrc: string = '/images/icon.png'
    @property({ type: String }) themeSrc?: string

    @property({ type: String }) networkName = 'No network connected'
    @property({ type: Boolean }) networkConnected = false
    @property({ type: String }) currentPage = ''

    static styles = [BaseElement.styles]

    private customThemeCss: string | null = null

    async updated(changedProps: Map<string, unknown>) {
        if (changedProps.has('themeSrc')) {
            if (this.themeSrc) {
                try {
                    const res = await fetch(this.themeSrc)
                    if (!res.ok) throw new Error(`HTTP ${res.status}`)
                    this.customThemeCss = await res.text()
                } catch (err) {
                    console.warn(
                        `[app-layout] Failed to load theme from "${this.themeSrc}":`,
                        err
                    )
                    this.customThemeCss = null
                }
                this.requestUpdate()
            } else {
                this.customThemeCss = null
            }
        }
    }

    private get effectiveThemeCss(): string {
        return this.customThemeCss ?? defaultTheme
    }

    private inferCurrentPageFromPath(pathname = window.location.pathname) {
        const path = pathname.toLowerCase()

        // TODO: Remove the backwards compatible routes before merge
        if (path.includes('/parties') || path.includes('/wallets')) {
            return 'Parties'
        }
        if (path.includes('/activities') || path.includes('/transactions')) {
            return 'Activities'
        }
        if (path.includes('/identity-providers') || path.includes('/ip')) {
            return 'IP'
        }
        if (path.includes('/networks') || path.includes('/settings')) {
            return 'Networks'
        }
        if (path.includes('/approve')) {
            return 'Approve'
        }
        if (path.includes('/login') || path.includes('/callback')) {
            return 'Login'
        }
        if (path.includes('/404')) {
            return 'Not Found'
        }

        return 'Wallet Gateway'
    }

    render() {
        return html`
            <style>
                ${unsafeCSS(this.effectiveThemeCss)}
            </style>

            <app-header
                .iconSrc=${this.iconSrc}
                .networkName=${this.networkName}
                .networkConnected=${this.networkConnected}
                .currentPage=${this.currentPage ||
                this.inferCurrentPageFromPath()}
            ></app-header>
            <div class="container" id="mainContent">
                <slot></slot>
            </div>
        `
    }
}
