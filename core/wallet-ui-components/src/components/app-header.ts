// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { BaseElement } from '../internal/base-element'
import { toRelPath } from '../routing'
import { menuIcon } from '../icons'
import cantonLogo from '../../images/logos/canton-logo.png'

export class LogoutEvent extends Event {
    constructor() {
        super('logout', { bubbles: true, composed: true })
    }
}

@customElement('app-header')
export class AppHeader extends BaseElement {
    @property({ type: String }) iconSrc: string = 'images/icon.png'
    @property({ type: String }) networkName: string = 'No network connected'
    @property({ type: Boolean }) networkConnected = false

    @state() private menuOpen = false
    @state() private darkMode = localStorage.getItem('theme') === 'dark'

    static styles = [
        BaseElement.styles,
        css`
            :host {
                display: block;
                width: 100%;
                background: var(--wg-surface);
                border-bottom: 1px solid var(--wg-border);
                position: sticky;
                top: 0;
                z-index: 1000;
                color: var(--wg-text);
            }

            header {
                position: relative;
                display: grid;
                grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
                align-items: center;
                gap: 0.5rem;
                padding: 0.4rem 0.65rem;
                min-height: 40px;
            }

            .brand {
                justify-self: start;
                border: none;
                background: transparent;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                padding: 0;
                flex: 0 0 auto;
            }

            .brand img {
                width: 24px;
                height: 24px;
                object-fit: contain;
                display: block;
            }

            .network-pill {
                justify-self: center;
                min-width: 0;
                width: auto;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 0.45rem;
                padding: 0.26rem 0.55rem;
                max-width: min(52vw, 420px);
            }

            .status-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                flex: 0 0 auto;
            }

            .status-dot.online {
                background: var(--wg-success);
                box-shadow: 0 0 0 2px rgba(var(--wg-success-rgb), 0.18);
            }

            .status-dot.offline {
                background: var(--wg-text-secondary);
                opacity: 0.7;
            }

            .network-name {
                font-size: var(--wg-font-size-sm);
                font-weight: var(--wg-font-weight-medium);
                color: var(--wg-text);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: min(36vw, 280px);
            }

            .menu-wrap {
                position: relative;
                justify-self: end;
            }

            .page-trigger {
                border: none;
                background: var(--wg-surface);
                color: var(--wg-text);
                padding: 0.3rem 0.55rem;
                display: inline-flex;
                align-items: center;
                gap: 0.3rem;
                font-size: var(--wg-font-size-sm);
                font-weight: var(--wg-font-weight-semibold);
                cursor: pointer;
                min-width: 0;
                max-width: 180px;
            }

            .page-trigger-icon {
                display: inline-flex;
                transition: transform 0.2s ease;
            }

            .page-trigger-icon.open {
                transform: rotate(180deg);
            }

            .dropdown {
                position: absolute;
                top: calc(100% + 8px);
                right: 0;
                min-width: 220px;
                max-width: min(92vw, 280px);
                background: var(--menu-bg, var(--wg-surface));
                border: 1px solid var(--wg-border);
                border-radius: var(--wg-radius-lg);
                box-shadow: var(--wg-shadow-md);
                padding: var(--wg-space-2);
                opacity: 0;
                transform: translateY(-4px);
                pointer-events: none;
                transition:
                    opacity 0.15s ease,
                    transform 0.15s ease;
            }

            .dropdown.open {
                opacity: 1;
                transform: translateY(0);
                pointer-events: auto;
            }

            .menu-item {
                width: 100%;
                text-align: left;
                border: none;
                border-radius: var(--wg-radius-md);
                background: transparent;
                color: var(--wg-text);
                font-size: var(--wg-font-size-sm);
                padding: 0.5rem 0.6rem;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: var(--wg-space-3);
            }

            .menu-item:hover {
                background: rgba(var(--wg-accent-rgb), 0.1);
            }

            .menu-divider {
                height: 1px;
                background: var(--wg-border);
                margin: var(--wg-space-2) 0;
            }
        `,
    ]

    connectedCallback() {
        super.connectedCallback()
        this.updateThemeAttribute()
        document.addEventListener('click', this.handleOutsideClick)
    }

    disconnectedCallback() {
        document.removeEventListener('click', this.handleOutsideClick)
        super.disconnectedCallback()
    }

    private handleOutsideClick = (event: MouseEvent) => {
        if (!this.menuOpen) return

        const path = event.composedPath()
        if (!path.includes(this)) {
            this.menuOpen = false
        }
    }

    private updateThemeAttribute() {
        if (this.darkMode) {
            this.setAttribute('theme', 'dark')
        } else {
            this.removeAttribute('theme')
        }
    }

    private toggleMenu(event: Event) {
        event.stopPropagation()
        this.menuOpen = !this.menuOpen
    }

    private navigateTo(route: string) {
        this.menuOpen = false
        window.location.href = toRelPath(route)
    }

    private logout() {
        this.menuOpen = false
        this.dispatchEvent(new LogoutEvent())
    }

    render() {
        return html`
            <header>
                <button
                    class="brand"
                    type="button"
                    aria-label="Go to home"
                    @click=${() => this.navigateTo('/')}
                >
                    <img src=${cantonLogo} alt="Canton logo" />
                </button>

                <div class="network-pill" title=${this.networkName}>
                    <span
                        class="status-dot ${this.networkConnected
                            ? 'online'
                            : 'offline'}"
                    ></span>
                    <span class="network-name">${this.networkName}</span>
                </div>

                <div class="menu-wrap">
                    <button
                        class="page-trigger"
                        type="button"
                        aria-haspopup="menu"
                        aria-expanded=${this.menuOpen}
                        @click=${this.toggleMenu}
                    >
                        <span
                            class="page-trigger-icon ${this.menuOpen
                                ? 'open'
                                : ''}"
                        >
                            ${menuIcon}
                        </span>
                    </button>

                    <div class="dropdown ${this.menuOpen ? 'open' : ''}">
                        <button
                            type="button"
                            class="menu-item"
                            @click=${() => this.navigateTo('/parties/')}
                        >
                            <span>Parties</span>
                        </button>
                        <button
                            type="button"
                            class="menu-item"
                            @click=${() => this.navigateTo('/transactions/')}
                        >
                            <span>Activities</span>
                        </button>
                        <button
                            type="button"
                            class="menu-item"
                            @click=${() => this.navigateTo('/settings/')}
                        >
                            <span>Networks</span>
                        </button>
                        <button
                            type="button"
                            class="menu-item"
                            @click=${() => this.navigateTo('/settings/')}
                        >
                            <span>Identity Providers</span>
                        </button>

                        <div class="menu-divider"></div>

                        <button
                            type="button"
                            class="menu-item"
                            @click=${this.logout}
                        >
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </header>
        `
    }
}
