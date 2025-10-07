// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html, css } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { BaseElement } from '../internal/BaseElement.js'

@customElement('app-header')
export class AppHeader extends BaseElement {
    @property({ type: String }) iconSrc: string = 'images/icon.png'
    @state() private menuOpen = false
    @state() private darkMode = localStorage.getItem('theme') === 'dark'

    static styles = [
        BaseElement.styles,
        css`
            :host {
                display: block;
                width: 100%;
                background-color: var(--header-bg, #fff);
                border-bottom: 1px solid #e5e7eb;
                position: relative;
                z-index: 10;
                --header-bg: #fff;
                --menu-bg: #fff;
                --text-color: #222;
                --border-color: #ccc;
                --shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }

            :host([data-bs-theme='dark']) {
                --header-bg: #1e1e1e;
                --menu-bg: #2b2b2b;
                --text-color: #fff;
                --border-color: #555;
            }

            header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.75rem 1rem;
                background-color: #f8f9fa;
                border-bottom: 1px solid #dee2e6;
            }

            header img {
                margin-right: 10px;
            }

            header .logo-box {
                display: inline-block;
                cursor: pointer;
            }

            .logo-box {
                display: flex;
                align-items: center;
                gap: 8px;
                font-weight: 600;
                cursor: pointer;
                color: var(--text-color);
                user-select: none;
            }

            .logo-box img {
                width: 24px;
                height: 24px;
            }

            /* Hamburger */
            .hamburger {
                background: none;
                border: none;
                font-size: 1.8rem;
                cursor: pointer;
                color: var(--text-color);
                padding: 0;
                line-height: 1;
            }

            /* Dropdown menu */
            .dropdown {
                position: absolute;
                top: 100%;
                right: 1rem;
                background: var(--menu-bg);
                border-radius: 12px;
                box-shadow: var(--shadow);
                display: flex;
                flex-direction: column;
                min-width: 200px;
                margin-top: 0.25rem;
                padding: 0.25rem 0;
                opacity: 0;
                transform: translateY(-5px);
                pointer-events: none;
                transition:
                    opacity 0.15s ease,
                    transform 0.15s ease;
                z-index: 1000;
            }

            .dropdown.open {
                opacity: 1;
                transform: translateY(0);
                pointer-events: auto;
            }

            .dropdown button {
                width: 100%;
                text-align: left;
                border: none;
                background: transparent;
                padding: 0.5rem 1rem;
                cursor: pointer;
                transition: background 0.15s ease;
                color: var(--text-color);
                font-size: 0.95rem;
            }

            .dropdown button:hover {
                background: rgba(0, 0, 0, 0.05);
            }

            .theme-toggle {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.5rem 1rem;
                border-top: 1px solid var(--border-color);
                margin-top: 0.25rem;
                cursor: pointer;
            }

            .toggle-switch {
                position: relative;
                width: 40px;
                height: 20px;
                background: #ccc;
                border-radius: 20px;
                transition: background 0.15s;
                flex-shrink: 0;
            }

            .toggle-switch::after {
                content: '';
                position: absolute;
                top: 2px;
                left: 2px;
                width: 16px;
                height: 16px;
                background: white;
                border-radius: 50%;
                transition: transform 0.15s;
            }

            .toggle-switch.on {
                background: #4caf50;
            }

            .toggle-switch.on::after {
                transform: translateX(20px);
            }
        `,
    ]

    connectedCallback() {
        super.connectedCallback()
        this.updateThemeAttribute()
    }

    private updateThemeAttribute() {
        if (this.darkMode) {
            this.setAttribute('data-bs-theme', 'dark')
        } else {
            this.removeAttribute('data-bs-theme')
        }
    }

    private toggleMenu() {
        this.menuOpen = !this.menuOpen
    }

    private toggleTheme() {
        this.darkMode = !this.darkMode
        localStorage.setItem('theme', this.darkMode ? 'dark' : 'light')
        this.updateThemeAttribute()
    }

    private navigateTo(url: string) {
        window.location.href = url
    }

    /** TODO: abstract this -- the component library might be used in a desktop Electron app */
    private logout() {
        localStorage.clear()
        window.location.href = '/login'
    }

    render() {
        return html`
            <header>
                <div class="logo-box" @click=${() => this.navigateTo('/')}>
                    <img src="${this.iconSrc}" alt="App Icon" />Wallet Gateway
                </div>

                <button
                    class="hamburger"
                    @click=${this.toggleMenu}
                    aria-label="Toggle menu"
                >
                    ☰
                </button>

                <div class="dropdown ${this.menuOpen ? 'open' : ''}">
                    <button @click=${() => this.navigateTo('/wallets/')}>
                        💰 Wallets
                    </button>
                    <button @click=${() => this.navigateTo('/networks/')}>
                        ⚙️ Settings
                    </button>
                    <button @click=${this.logout}>🚪 Logout</button>

                    <div class="theme-toggle" @click=${this.toggleTheme}>
                        <span
                            >${this.darkMode
                                ? '🌙 Dark Mode'
                                : '☀️ Light Mode'}</span
                        >
                        <div
                            class="toggle-switch ${this.darkMode ? 'on' : ''}"
                        ></div>
                    </div>
                </div>
            </header>
        `
    }
}
