// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css } from 'lit'
import { BaseElement } from '../internal/base-element'
import { cssToString } from '../utils'

export interface WalletPickerEntry {
    walletId: string
    name: string
    type: 'extension' | 'gateway'
    description?: string | undefined
    icon?: string | undefined
    url?: string | undefined
}

export interface WalletPickerResult {
    walletId: string
    name: string
    type: 'extension' | 'gateway'
    url?: string | undefined
}

const SUBSTITUTABLE_CSS = cssToString([
    BaseElement.styles,
    css`
        * {
            box-sizing: border-box;
            font-family: var(
                --wg-theme-font-family,
                -apple-system,
                BlinkMacSystemFont,
                'Segoe UI',
                Roboto,
                'Helvetica Neue',
                Arial,
                sans-serif
            );
            color: var(--wg-theme-text-color, #111827);
        }

        .root {
            background-color: var(--wg-theme-background-color, #ffffff);
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
        }

        .header {
            padding: 20px 24px 16px;
            border-bottom: 1px solid var(--wg-theme-border-color, #e5e7eb);
        }

        .header h2 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
        }

        .header p {
            margin: 6px 0 0;
            font-size: 13px;
            color: var(--wg-theme-text-secondary, #6b7280);
        }

        .wallet-list {
            flex: 1;
            overflow-y: auto;
            padding: 12px;
        }

        .wallet-card {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 14px 16px;
            border-radius: 10px;
            border: 1px solid var(--wg-theme-border-color, #e5e7eb);
            background: var(--wg-theme-surface-color, #f9fafb);
            cursor: pointer;
            transition: all 0.15s ease;
            margin-bottom: 8px;
            width: 100%;
            text-align: left;
        }

        .wallet-card:hover {
            background: var(--wg-theme-surface-hover, #f3f4f6);
            border-color: var(--wg-theme-primary-color, #4f46e5);
        }

        .wallet-card:active {
            transform: scale(0.99);
        }

        .wallet-icon {
            width: 42px;
            height: 42px;
            border-radius: 10px;
            background: var(--wg-theme-icon-bg, rgba(79, 70, 229, 0.08));
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            color: var(--wg-theme-primary-color, #4f46e5);
        }

        .wallet-icon img {
            width: 24px;
            height: 24px;
            border-radius: 4px;
        }

        .wallet-icon svg {
            width: 22px;
            height: 22px;
        }

        .wallet-info {
            flex: 1;
            min-width: 0;
        }

        .wallet-name {
            font-size: 15px;
            font-weight: 500;
        }

        .wallet-description {
            font-size: 12px;
            color: var(--wg-theme-text-secondary, #6b7280);
            margin-top: 2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .wallet-badge {
            font-size: 11px;
            font-weight: 500;
            padding: 3px 10px;
            border-radius: 6px;
            background: var(--wg-theme-badge-bg, rgba(0, 0, 0, 0.06));
            color: var(--wg-theme-text-secondary, #6b7280);
            flex-shrink: 0;
        }

        /* Status views */
        .status-view {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 48px 24px;
            gap: 16px;
            text-align: center;
            flex: 1;
        }

        .status-view h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
        }

        .status-view p {
            margin: 0;
            font-size: 14px;
            color: var(--wg-theme-text-secondary, #6b7280);
        }

        .spinner {
            width: 36px;
            height: 36px;
            border: 3px solid var(--wg-theme-border-color, #e5e7eb);
            border-top-color: var(--wg-theme-primary-color, #4f46e5);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
            to {
                transform: rotate(360deg);
            }
        }

        .success-icon {
            color: var(--wg-theme-success-color, #10b981);
        }

        .error-icon {
            color: var(--wg-theme-error-color, #ef4444);
        }

        .btn-row {
            display: flex;
            gap: 8px;
            margin-top: 8px;
        }

        .btn-primary {
            background: var(--wg-theme-primary-color, #4f46e5);
            color: #fff;
            border: none;
            border-radius: 8px;
            padding: 10px 24px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.15s;
        }

        .btn-primary:hover {
            background: var(--wg-theme-primary-hover, #4338ca);
        }

        .btn-secondary {
            background: transparent;
            color: var(--wg-theme-text-secondary, #6b7280);
            border: 1px solid var(--wg-theme-border-color, #e5e7eb);
            border-radius: 8px;
            padding: 10px 24px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
        }

        .empty-state {
            color: var(--wg-theme-text-secondary, #6b7280);
        }

        .section-label {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--wg-theme-text-secondary, #6b7280);
            padding: 4px 16px 8px;
        }
    `,
])

/**
 * <swk-wallet-picker> — a wallet selection component modelled after PartyLayer's
 * WalletModal. Designed for popup rendering (same pattern as <swk-discovery>).
 *
 * Communication:
 *   - Reads wallet entries from localStorage key `splice_wallet_picker_entries`
 *   - Posts a WalletPickerResult to window.opener via postMessage on selection
 *
 * States: list → connecting → connected | error
 */
export class WalletPicker extends HTMLElement {
    static styles = SUBSTITUTABLE_CSS

    private root: HTMLElement
    private entries: WalletPickerEntry[] = []
    private state: 'list' | 'connecting' | 'connected' | 'error' = 'list'
    private selectedEntry: WalletPickerEntry | null = null
    private errorMessage = ''

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })

        const ctor = this.constructor as typeof HTMLElement & {
            styles?: string
        }
        if (ctor.styles) {
            const style = document.createElement('style')
            style.textContent = ctor.styles
            this.shadowRoot!.appendChild(style)
        }

        this.root = document.createElement('div')
        this.root.className = 'root'

        this.loadEntries()
    }

    private loadEntries(): void {
        const stored = localStorage.getItem('splice_wallet_picker_entries')
        if (!stored) return
        try {
            this.entries = JSON.parse(stored) as WalletPickerEntry[]
        } catch {
            this.entries = []
        }
    }

    private selectWallet(entry: WalletPickerEntry): void {
        this.selectedEntry = entry
        this.state = 'connecting'
        this.render()

        const result: WalletPickerResult = {
            walletId: entry.walletId,
            name: entry.name,
            type: entry.type,
            url: entry.url,
        }

        if (window.opener) {
            window.opener.postMessage(
                {
                    messageType: 'SPLICE_WALLET_PICKER_RESULT',
                    walletId: result.walletId,
                    name: result.name,
                    walletType: result.type,
                    url: result.url,
                },
                '*'
            )
        }
    }

    /** Called from the parent window to transition to connected/error */
    public setConnected(): void {
        this.state = 'connected'
        this.render()
        setTimeout(() => {
            if (window.opener) window.close()
        }, 1200)
    }

    public setError(message: string): void {
        this.errorMessage = message
        this.state = 'error'
        this.render()
    }

    // ── Rendering ──────────────────────────────────────────

    private renderHeader(title: string, subtitle?: string): HTMLElement {
        const header = this.el('div', '', { class: 'header' })
        header.appendChild(this.el('h2', title))
        if (subtitle) {
            header.appendChild(this.el('p', subtitle))
        }
        return header
    }

    private renderWalletCard(entry: WalletPickerEntry): HTMLElement {
        const card = this.el('button', '', { class: 'wallet-card' })

        // Icon
        const icon = this.el('div', '', { class: 'wallet-icon' })
        if (entry.icon) {
            const img = this.el('img', '', { src: entry.icon, alt: entry.name })
            icon.appendChild(img)
        } else {
            icon.innerHTML =
                entry.type === 'extension'
                    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
                    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/><circle cx="12" cy="10" r="2"/></svg>'
        }
        card.appendChild(icon)

        // Info
        const info = this.el('div', '', { class: 'wallet-info' })
        info.appendChild(this.el('div', entry.name, { class: 'wallet-name' }))
        if (entry.description) {
            info.appendChild(
                this.el('div', entry.description, {
                    class: 'wallet-description',
                })
            )
        } else if (entry.url) {
            info.appendChild(
                this.el('div', entry.url, { class: 'wallet-description' })
            )
        }
        card.appendChild(info)

        // Badge
        const badgeText = entry.type === 'extension' ? 'Extension' : 'Gateway'
        card.appendChild(this.el('span', badgeText, { class: 'wallet-badge' }))

        card.addEventListener('click', () => this.selectWallet(entry))
        return card
    }

    private renderList(): HTMLElement {
        const container = this.el('div', '', {
            style: 'display:flex;flex-direction:column;height:100%',
        })

        container.appendChild(
            this.renderHeader(
                'Connect Wallet',
                'Choose a wallet to connect to your dApp'
            )
        )

        const list = this.el('div', '', { class: 'wallet-list' })

        if (this.entries.length === 0) {
            const empty = this.el('div', '', { class: 'status-view' })
            empty.appendChild(
                this.el('h3', 'No wallets available', { class: 'empty-state' })
            )
            empty.appendChild(
                this.el(
                    'p',
                    'Install a Canton wallet extension or configure a Wallet Gateway.'
                )
            )
            list.appendChild(empty)
        } else {
            // Group by type
            const extensions = this.entries.filter(
                (e) => e.type === 'extension'
            )
            const gatewayEntries = this.entries.filter(
                (e) => e.type === 'gateway'
            )

            if (extensions.length > 0) {
                list.appendChild(
                    this.el('div', 'Browser Extension', {
                        class: 'section-label',
                    })
                )
                for (const e of extensions) {
                    list.appendChild(this.renderWalletCard(e))
                }
            }

            if (gatewayEntries.length > 0) {
                list.appendChild(
                    this.el('div', 'Wallet Gateways', {
                        class: 'section-label',
                    })
                )
                for (const e of gatewayEntries) {
                    list.appendChild(this.renderWalletCard(e))
                }
            }
        }

        container.appendChild(list)
        return container
    }

    private renderConnecting(): HTMLElement {
        const container = this.el('div', '', {
            style: 'display:flex;flex-direction:column;height:100%',
        })
        container.appendChild(this.renderHeader('Connecting...'))

        const view = this.el('div', '', { class: 'status-view' })
        view.appendChild(this.el('div', '', { class: 'spinner' }))
        view.appendChild(
            this.el('h3', `Connecting to ${this.selectedEntry?.name ?? ''}...`)
        )
        view.appendChild(
            this.el(
                'p',
                this.selectedEntry?.type === 'gateway'
                    ? 'Approve the connection in the wallet popup'
                    : 'Approve the connection in your extension'
            )
        )
        container.appendChild(view)
        return container
    }

    private renderConnected(): HTMLElement {
        const container = this.el('div', '', {
            style: 'display:flex;flex-direction:column;height:100%',
        })
        container.appendChild(this.renderHeader('Connected'))

        const view = this.el('div', '', { class: 'status-view' })

        const icon = this.el('div', '', { class: 'success-icon' })
        icon.innerHTML = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`
        view.appendChild(icon)

        view.appendChild(
            this.el(
                'h3',
                `Connected to ${this.selectedEntry?.name ?? 'wallet'}`
            )
        )
        container.appendChild(view)
        return container
    }

    private renderError(): HTMLElement {
        const container = this.el('div', '', {
            style: 'display:flex;flex-direction:column;height:100%',
        })
        container.appendChild(this.renderHeader('Connection Failed'))

        const view = this.el('div', '', { class: 'status-view' })

        const icon = this.el('div', '', { class: 'error-icon' })
        icon.innerHTML = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>`
        view.appendChild(icon)

        view.appendChild(this.el('h3', 'Failed to connect'))
        view.appendChild(
            this.el('p', this.errorMessage || 'An unexpected error occurred')
        )

        const btnRow = this.el('div', '', { class: 'btn-row' })
        const retryBtn = this.el('button', 'Try Again', {
            class: 'btn-primary',
        })
        retryBtn.addEventListener('click', () => {
            this.state = 'list'
            this.selectedEntry = null
            this.errorMessage = ''
            this.render()
        })
        const cancelBtn = this.el('button', 'Cancel', {
            class: 'btn-secondary',
        })
        cancelBtn.addEventListener('click', () => window.close())
        btnRow.append(retryBtn, cancelBtn)
        view.appendChild(btnRow)

        container.appendChild(view)
        return container
    }

    render(): void {
        let content: HTMLElement
        switch (this.state) {
            case 'connecting':
                content = this.renderConnecting()
                break
            case 'connected':
                content = this.renderConnected()
                break
            case 'error':
                content = this.renderError()
                break
            default:
                content = this.renderList()
        }

        // Replace root content
        if (this.shadowRoot) {
            Array.from(this.shadowRoot.childNodes).forEach((node) => {
                if (!(node instanceof HTMLStyleElement)) {
                    this.shadowRoot!.removeChild(node)
                }
            })
            this.shadowRoot.appendChild(content)
        }
    }

    connectedCallback(): void {
        this.render()
    }

    // ── Helpers ─────────────────────────────────────────────

    private el<K extends keyof HTMLElementTagNameMap>(
        tag: K,
        text?: string,
        attrs: Record<string, string> = {}
    ): HTMLElementTagNameMap[K] {
        const element = document.createElement(tag)
        if (text) element.innerText = text
        for (const [key, val] of Object.entries(attrs)) {
            element.setAttribute(key, val)
        }
        return element
    }
}

customElements.define('swk-wallet-picker', WalletPicker)
