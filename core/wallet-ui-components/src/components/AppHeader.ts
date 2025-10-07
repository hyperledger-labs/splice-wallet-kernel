// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { LitElement, html, css } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

@customElement('app-header')
export class AppHeader extends LitElement {
    @property({ type: String }) iconSrc: string = 'images/icon.png'
    @state() private menuOpen = false

    static styles = css`
        :host {
            display: block;
            width: 100%;
            background-color: #fff;
            border-bottom: 1px solid #e5e7eb;
            position: relative;
            z-index: 10;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.75rem 1rem;
            max-width: 100%;
        }

        .logo-box {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
            cursor: pointer;
            color: #222;
            user-select: none;
        }

        .logo-box img {
            width: 24px;
            height: 24px;
        }

        /* Desktop menu */
        .menu {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .menu button {
            background: none;
            border: 1px solid #ccc;
            border-radius: 6px;
            padding: 6px 10px;
            cursor: pointer;
            transition: background 0.2s;
            font-size: 0.9rem;
        }

        .menu button:hover {
            background: #f5f5f5;
        }

        /* Hamburger button (hidden on desktop) */
        .menu-toggle {
            display: none;
            background: none;
            border: none;
            font-size: 1.6rem;
            cursor: pointer;
            color: #333;
        }

        /* Mobile styles */
        @media (max-width: 768px) {
            .menu-toggle {
                display: block;
            }

            .menu {
                display: none;
                flex-direction: column;
                position: absolute;
                top: 56px;
                right: 1rem;
                background: white;
                border: 1px solid #ddd;
                border-radius: 10px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                padding: 0.5rem;
                width: 180px;
                animation: fadeIn 0.2s ease-in-out;
            }

            .menu.open {
                display: flex;
            }

            .menu button {
                width: 100%;
                text-align: left;
                border: none;
                padding: 0.75rem 1rem;
                font-size: 1rem;
            }

            .menu button:hover {
                background: #f2f2f2;
            }

            @keyframes fadeIn {
                from {
                    opacity: 0;
                    transform: translateY(-5px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        }
    `

    private toggleMenu() {
        this.menuOpen = !this.menuOpen
    }

    private navigateTo(url: string) {
        window.location.href = url
    }

    private logout() {
        localStorage.clear()
        window.location.href = '/login'
    }

    render() {
        return html`
            <header class="header">
                <div
                    class="logo-box"
                    @click=${() => this.navigateTo('/')}
                    aria-label="Go to home"
                >
                    <img src="${this.iconSrc}" alt="App Icon" />
                    <span>Splice Wallet</span>
                </div>

                <!-- Desktop Menu -->
                <nav class="menu ${this.menuOpen ? 'open' : ''}">
                    <button @click=${() => this.navigateTo('/networks/')}>
                        Settings
                    </button>
                    <button @click=${this.logout}>Logout</button>
                </nav>

                <!-- Hamburger toggle (only visible on mobile) -->
                <button
                    class="menu-toggle"
                    @click=${this.toggleMenu}
                    aria-label="Toggle menu"
                >
                    ☰
                </button>
            </header>
        `
    }
}
