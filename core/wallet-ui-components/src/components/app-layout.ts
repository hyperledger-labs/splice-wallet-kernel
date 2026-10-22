// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import defaultTheme from '../../themes/default.css?inline'
import { BaseElement } from '../internal/base-element'

@customElement('app-layout')
export class AppLayout extends BaseElement {
    @property({ type: String }) accessor iconSrc: string = '/images/icon.png'
    @property({ type: String }) accessor themeSrc: string | undefined

    @property({ type: String }) accessor networkName = 'No network connected'
    @property({ type: Boolean }) accessor networkConnected = false
    @property({ type: String }) accessor currentPage = ''
    @property({ type: String }) accessor dappApiUrl = ''

    static styles = [
        BaseElement.styles,
        css`
            :host {
                display: block;
                width: 100%;
                min-width: 320px;
            }
        `,
    ]

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

    render() {
        return html`
            <style>
                ${unsafeCSS(this.effectiveThemeCss)}
            </style>

            <app-header
                .iconSrc=${this.iconSrc}
                .networkName=${this.networkName}
                .networkConnected=${this.networkConnected}
                .currentPage=${this.currentPage}
                .dappApiUrl=${this.dappApiUrl}
            ></app-header>
            <div class="container" id="mainContent">
                <slot></slot>
            </div>
        `
    }
}
