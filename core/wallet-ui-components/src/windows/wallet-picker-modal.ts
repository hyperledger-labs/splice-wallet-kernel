// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type {
    BrowserPlatform,
    WalletPickerEntry,
    WalletPickerResult,
    WalletPickerSuggestedEntry,
} from '@canton-network/core-types'
import cantonLogo from '../../images/logos/canton-logo.png'

const RECENT_KEY = 'splice_wallet_picker_recent'
const SUGGESTED_KEY = 'splice_wallet_picker_suggested_entries'

type RecentGateway = { name: string; rpcUrl: string }

/**
 * In-page wallet picker modal.
 *
 * This is the framework-neutral, SDK-default counterpart to the popup-based
 * {@link ./wallet-picker.ts | pickWallet}. Instead of opening a separate
 * browser window, it renders a modal directly into the host page inside a
 * Shadow DOM (so host styles cannot leak in or out).
 *
 * The public contract mirrors the popup module so the SDK can drive it the
 * same way:
 *   - {@link pickWalletModal} shows the wallet list and resolves with the
 *     user's first selection.
 *   - {@link notifyWalletPickerModalConnected} closes the modal on success.
 *   - {@link notifyWalletPickerModalError} shows an error and returns to the
 *     list so the user can retry.
 *   - {@link waitForWalletPickerModalRetrySelection} resolves with the next
 *     selection after an error.
 *   - {@link setWalletPickerModalWalletConnectUri} feeds a WalletConnect
 *     pairing URI/QR into the connecting view.
 */

const el = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    text = '',
    attrs: Record<string, string> = {}
): HTMLElementTagNameMap[K] => {
    const node = document.createElement(tag)
    if (text) node.textContent = text
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v)
    return node
}

const BROWSER_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'

const detectBrowserPlatform = (): BrowserPlatform | 'unsupported' => {
    const userAgent = window.navigator.userAgent
    if (/firefox/i.test(userAgent)) return 'firefox'
    if (/chrome|chromium|crios/i.test(userAgent)) return 'chrome'
    return 'unsupported'
}

// The connecting spinner animates a registered <angle> custom property so the
// conic-gradient highlight travels around the ring. `@property` is ignored when
// declared inside a shadow root, so it must be registered at the document level.
let spinnerPropertyRegistered = false
const ensureSpinnerProperty = (): void => {
    if (spinnerPropertyRegistered) return
    spinnerPropertyRegistered = true
    try {
        const cssApi = (
            globalThis as {
                CSS?: { registerProperty?: (definition: object) => void }
            }
        ).CSS
        cssApi?.registerProperty?.({
            name: '--swk-spinner-angle',
            syntax: '<angle>',
            inherits: false,
            initialValue: '0deg',
        })
    } catch {
        // Already registered (e.g. the modal was opened before) — safe to ignore.
    }
}

class WalletPickerModalController {
    private host: HTMLDivElement
    private shadow: ShadowRoot
    private backdrop: HTMLElement | null = null
    private contentEl: HTMLElement | null = null
    private onHeightTransitionEnd: ((e: TransitionEvent) => void) | undefined =
        undefined

    private entries: WalletPickerEntry[] = []
    private recentGateways: RecentGateway[] = []
    private suggested: WalletPickerSuggestedEntry[] = []
    private readonly platform = detectBrowserPlatform()

    private state: 'list' | 'gateway' | 'connecting' = 'list'
    private errorMessage = ''
    private selected: WalletPickerResult | null = null
    private selectedIcon: string | null = null
    private wcUri: string | null = null
    private wcQrDataUrl: string | null = null
    private copied = false

    private destroyed = false
    private pending: {
        resolve: (v: WalletPickerResult) => void
        reject: (e: unknown) => void
    } | null = null
    private backPending: { resolve: () => void } | null = null
    private backRequested = false

    constructor(entries: WalletPickerEntry[]) {
        this.entries = entries
        this.recentGateways = this.loadRecentGateways()
        this.suggested = this.loadSuggested()

        ensureSpinnerProperty()

        this.host = document.createElement('div')
        this.host.setAttribute('data-swk-wallet-picker-modal', '')
        this.applyTheme(modalTheme)
        this.shadow = this.host.attachShadow({ mode: 'open' })

        const style = document.createElement('style')
        style.textContent = MODAL_CSS
        this.shadow.appendChild(style)

        document.body.appendChild(this.host)
        this.render()
    }

    // ── Public flow control ────────────────────────────────

    awaitSelection(): Promise<WalletPickerResult> {
        return new Promise<WalletPickerResult>((resolve, reject) => {
            this.pending = { resolve, reject }
        })
    }

    /**
     * Resolves when the user clicks "back" from the connecting view, signalling
     * the SDK to abort the in-flight attempt and re-await a selection.
     */
    awaitBack(): Promise<void> {
        if (this.backRequested) {
            this.backRequested = false
            return Promise.resolve()
        }
        return new Promise<void>((resolve) => {
            this.backPending = { resolve }
        })
    }

    setConnected(): void {
        this.destroy()
    }

    setError(message: string): void {
        this.errorMessage = message
        this.selected = null
        this.selectedIcon = null
        this.wcUri = null
        this.wcQrDataUrl = null
        this.state = 'list'
        this.render()
    }

    setWalletConnectUri(uri: string, qrDataUrl?: string): void {
        this.wcUri = uri
        this.wcQrDataUrl = qrDataUrl ?? null
        if (this.state === 'connecting' && this.isWalletConnect()) {
            this.render()
        }
    }

    isActive(): boolean {
        return !this.destroyed
    }

    /** Forces the color scheme on the host element (`'auto'` clears the override). */
    applyTheme(theme: WalletPickerModalTheme): void {
        if (theme === 'auto') {
            this.host.removeAttribute('data-swk-theme')
        } else {
            this.host.setAttribute('data-swk-theme', theme)
        }
    }

    destroy(): void {
        if (this.destroyed) return
        this.destroyed = true
        this.host.remove()
    }

    // ── Storage helpers ────────────────────────────────────

    private loadRecentGateways(): RecentGateway[] {
        try {
            const raw = localStorage.getItem(RECENT_KEY)
            if (raw) return JSON.parse(raw)
        } catch {
            // ignore
        }
        return []
    }

    private loadSuggested(): WalletPickerSuggestedEntry[] {
        try {
            const raw = localStorage.getItem(SUGGESTED_KEY)
            if (raw) return JSON.parse(raw)
        } catch {
            // ignore
        }
        return []
    }

    private removeRecentGateway(rpcUrl: string): void {
        this.recentGateways = this.loadRecentGateways().filter(
            (r) => r.rpcUrl !== rpcUrl
        )
        if (this.recentGateways.length === 0) {
            localStorage.removeItem(RECENT_KEY)
        } else {
            localStorage.setItem(
                RECENT_KEY,
                JSON.stringify(this.recentGateways)
            )
        }
        this.render()
    }

    // ── Entry derivation (mirrors swk-wallet-picker) ───────

    private getAllEntries(): {
        entry: WalletPickerEntry
        isRecent: boolean
    }[] {
        const knownUrls = new Set(
            this.entries
                .filter((e) => e.type === 'remote' && e.url)
                .map((e) => e.url)
        )

        const recentEntries = this.recentGateways
            .filter((r) => !knownUrls.has(r.rpcUrl))
            .map((r) => ({
                entry: {
                    providerId: 'remote:' + r.rpcUrl,
                    name: r.name,
                    type: 'remote' as const,
                    url: r.rpcUrl,
                    reuseGlobalWalletPopup: true,
                } satisfies WalletPickerEntry,
                isRecent: true,
            }))

        return [
            ...this.entries.map((entry) => ({ entry, isRecent: false })),
            ...recentEntries,
        ]
    }

    private getSuggestedEntries(): WalletPickerSuggestedEntry[] {
        const detected = this.getAllEntries()
        const notInstalled = this.suggested.filter(
            (s) => !detected.some((d) => d.entry.providerId === s.providerId)
        )
        return notInstalled.sort((a, b) => {
            const aSupported = a.installUrls.some(
                (u) => u.platform === this.platform
            )
            const bSupported = b.installUrls.some(
                (u) => u.platform === this.platform
            )
            if (aSupported && !bSupported) return -1
            if (!aSupported && bSupported) return 1
            return a.name.localeCompare(b.name)
        })
    }

    // ── Selection ──────────────────────────────────────────

    private select(result: WalletPickerResult, icon?: string): void {
        this.selected = result
        this.selectedIcon = icon ?? null
        this.errorMessage = ''
        this.state = 'connecting'
        this.render()

        const pending = this.pending
        this.pending = null
        pending?.resolve(result)
    }

    private cancel(): void {
        const pending = this.pending
        this.pending = null
        this.destroy()
        pending?.reject(new Error('User closed the wallet picker'))
    }

    /** Return to the wallet list from the connecting view and signal the SDK. */
    private requestBack(): void {
        this.selected = null
        this.selectedIcon = null
        this.wcUri = null
        this.wcQrDataUrl = null
        this.errorMessage = ''
        this.state = 'list'
        this.render()

        if (this.backPending) {
            const back = this.backPending
            this.backPending = null
            back.resolve()
        } else {
            // Back was clicked before the SDK started awaiting it; remember it.
            this.backRequested = true
        }
    }

    private isWalletConnect(): boolean {
        return this.selected?.providerId === 'walletconnect'
    }

    // ── Rendering ──────────────────────────────────────────

    private render(): void {
        // Mount the backdrop and content shell once so their entry animations
        // (fade-in / slide-up) don't replay on every state change. Subsequent
        // renders only swap the inner content.
        const firstMount = !this.backdrop
        if (firstMount) {
            this.backdrop = el('div', '', {
                class: 'discovery-modal-backdrop',
            })
            this.backdrop.addEventListener('click', (e) => {
                if (e.target === this.backdrop) this.cancel()
            })

            this.contentEl = el('div', '', {
                class: 'discovery-modal-content',
                role: 'dialog',
                'aria-modal': 'true',
            })
            this.backdrop.appendChild(this.contentEl)
            this.shadow.appendChild(this.backdrop)
        }

        const content = this.contentEl!
        const inner = el('div', '', { class: 'discovery-modal-inner' })
        inner.appendChild(this.renderHeader())
        inner.appendChild(this.renderBody())

        if (this.state === 'list') {
            inner.appendChild(this.renderFooter())
        }

        if (firstMount) {
            content.appendChild(inner)
            return
        }

        // FLIP the height: measure the current size, swap the content, measure
        // the new size, then transition between the two.
        this.clearHeightAnimation()
        const prevHeight = content.offsetHeight
        content.replaceChildren(inner)
        const nextHeight = content.offsetHeight

        if (prevHeight === nextHeight) return

        content.style.height = `${prevHeight}px`
        // Force a reflow so the browser commits the start height before we
        // transition to the target height.
        void content.offsetHeight
        content.style.transition = 'height 220ms cubic-bezier(0.4, 0, 0.2, 1)'
        content.style.height = `${nextHeight}px`

        this.onHeightTransitionEnd = (e: TransitionEvent) => {
            if (e.propertyName !== 'height') return
            this.clearHeightAnimation()
        }
        content.addEventListener('transitionend', this.onHeightTransitionEnd)
    }

    /** Reset any in-flight height transition back to auto sizing. */
    private clearHeightAnimation(): void {
        const content = this.contentEl
        if (!content) return
        if (this.onHeightTransitionEnd) {
            content.removeEventListener(
                'transitionend',
                this.onHeightTransitionEnd
            )
            this.onHeightTransitionEnd = undefined
        }
        content.style.transition = ''
        content.style.height = ''
    }

    private renderHeader(): HTMLElement {
        const header = el('div', '', { class: 'discovery-modal-header' })

        const showBack = this.state === 'gateway' || this.state === 'connecting'
        if (showBack) {
            const back = el('button', '', {
                class: 'discovery-modal-back',
                type: 'button',
                'aria-label': 'Go back',
            })
            back.innerHTML =
                '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 4L6 8l4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
            back.addEventListener('click', () => {
                if (this.state === 'connecting') {
                    this.requestBack()
                } else {
                    this.state = 'list'
                    this.render()
                }
            })
            header.appendChild(back)
        }

        const heading = el('div', '', { class: 'discovery-modal-heading' })
        const title =
            this.state === 'connecting'
                ? this.isWalletConnect()
                    ? 'Scan with your phone'
                    : 'Connecting...'
                : this.state === 'gateway'
                  ? 'Remote Wallet'
                  : 'Connect Wallet'
        heading.appendChild(el('h2', title))
        header.appendChild(heading)

        const close = el('button', '', {
            class: 'discovery-modal-close',
            type: 'button',
            'aria-label': 'Close modal',
        })
        close.innerHTML =
            '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
        close.addEventListener('click', () => this.cancel())
        header.appendChild(close)

        return header
    }

    private renderBody(): HTMLElement {
        const body = el('div', '', { class: 'discovery-modal-body' })
        const view = el('div', '', { class: 'discovery-modal-view' })

        if (this.state === 'connecting') {
            view.appendChild(this.renderConnecting())
        } else if (this.state === 'gateway') {
            view.appendChild(this.renderGateway())
        } else {
            view.appendChild(this.renderList())
        }

        body.appendChild(view)
        return body
    }

    private renderList(): HTMLElement {
        const container = el('div', '', { class: 'wallet-picker-container' })

        if (this.errorMessage) {
            container.appendChild(
                el('div', this.errorMessage, {
                    class: 'discovery-modal-error',
                    role: 'alert',
                })
            )
        }

        // Order the flat list: saved remote connections first, then installed
        // extensions, then WalletConnect, then other remote wallets, then
        // everything else (not-yet-installed wallets).
        const detected = this.getAllEntries()
        const isWc = (e: WalletPickerEntry) => e.providerId === 'walletconnect'

        const recent = detected.filter((d) => d.isRecent)
        const installed = detected.filter(
            (d) => !d.isRecent && d.entry.type === 'browser' && !isWc(d.entry)
        )
        const walletConnect = detected.filter(
            (d) => !d.isRecent && isWc(d.entry)
        )
        const remote = detected.filter(
            (d) => !d.isRecent && d.entry.type === 'remote' && !isWc(d.entry)
        )
        const rest = detected.filter(
            (d) =>
                !recent.includes(d) &&
                !installed.includes(d) &&
                !walletConnect.includes(d) &&
                !remote.includes(d)
        )

        for (const { entry, isRecent } of [
            ...recent,
            ...installed,
            ...walletConnect,
            ...remote,
        ]) {
            container.appendChild(this.renderWalletItem(entry, isRecent))
        }

        // Remote Wallet (custom URL) connector, grouped with remote wallets.
        const gatewayItem = el('div', '', { class: 'wallet-picker-item' })
        const gatewayBtn = el('button', '', {
            class: 'wallet-picker-item-main',
            type: 'button',
        })
        const gwIcon = el('span', '', { class: 'wallet-icon' })
        gwIcon.appendChild(
            el('img', '', { src: cantonLogo, alt: 'Remote Wallet' })
        )
        const gwInfo = el('div', '', { class: 'wallet-info' })
        gwInfo.appendChild(el('h3', 'Remote Wallet'))
        gatewayBtn.append(gwIcon, gwInfo)
        gatewayBtn.addEventListener('click', () => {
            this.state = 'gateway'
            this.render()
        })
        gatewayItem.appendChild(gatewayBtn)
        container.appendChild(gatewayItem)

        // The rest: any leftover detected wallets, then not-yet-installed ones.
        for (const { entry, isRecent } of rest) {
            container.appendChild(this.renderWalletItem(entry, isRecent))
        }
        for (const entry of this.getSuggestedEntries()) {
            container.appendChild(this.renderSuggestedItem(entry))
        }

        // Wrap the scrollable list so the bottom fade can be pinned to the
        // viewport bottom (an absolute overlay in a non-scrolling wrapper)
        // rather than scrolling with the content.
        const scroll = el('div', '', { class: 'wallet-picker-scroll' })
        scroll.appendChild(container)
        const fadeTop = el('div', '', {
            class: 'wallet-picker-fade wallet-picker-fade-top',
        })
        const fade = el('div', '', { class: 'wallet-picker-fade' })
        scroll.append(fadeTop, fade)

        // Show a fade at the top once scrolled down (content above) and at the
        // bottom while there's more to scroll to; hide each at its edge.
        const updateFade = () => {
            const scrollable =
                container.scrollHeight - container.clientHeight > 1
            const atTop = container.scrollTop <= 1
            const atBottom =
                container.scrollTop + container.clientHeight >=
                container.scrollHeight - 1
            fadeTop.classList.toggle('is-hidden', !scrollable || atTop)
            fade.classList.toggle('is-hidden', !scrollable || atBottom)
        }
        container.addEventListener('scroll', updateFade, { passive: true })
        requestAnimationFrame(updateFade)

        return scroll
    }

    private renderWalletItem(
        entry: WalletPickerEntry,
        isRecent: boolean
    ): HTMLElement {
        const item = el('div', '', { class: 'wallet-picker-item' })

        const main = el('button', '', {
            class: 'wallet-picker-item-main',
            type: 'button',
        })

        const icon = el('span', '', { class: 'wallet-icon' })
        if (entry.icon) {
            icon.appendChild(
                el('img', '', { src: entry.icon, alt: entry.name })
            )
        } else if (entry.type === 'remote') {
            // Remote wallets (e.g. saved gateways) default to the Canton logo.
            icon.appendChild(
                el('img', '', { src: cantonLogo, alt: entry.name })
            )
        } else {
            const fallback = el('span', entry.name.charAt(0).toUpperCase(), {
                class: 'wallet-icon-fallback',
            })
            icon.appendChild(fallback)
        }

        const info = el('div', '', { class: 'wallet-info' })
        info.appendChild(el('h3', entry.name))

        main.append(icon, info)

        if (entry.type === 'browser') {
            main.appendChild(
                el('span', 'Installed', { class: 'wallet-installed-badge' })
            )
        }

        main.addEventListener('click', () =>
            this.select(
                {
                    providerId: entry.providerId,
                    name: entry.name,
                    type: entry.type,
                    url: entry.url,
                    reuseGlobalWalletPopup: entry.reuseGlobalWalletPopup,
                },
                entry.icon
            )
        )
        item.appendChild(main)

        if (isRecent && entry.url) {
            const remove = el('button', '', {
                class: 'wallet-picker-remove',
                type: 'button',
                'aria-label': `Remove ${entry.name}`,
                title: 'Remove',
            })
            remove.innerHTML =
                '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
            remove.addEventListener('click', (e) => {
                e.stopPropagation()
                this.removeRecentGateway(entry.url as string)
            })
            item.appendChild(remove)
        }

        return item
    }

    private renderSuggestedItem(
        entry: WalletPickerSuggestedEntry
    ): HTMLElement {
        // Prefer an install link for the user's current browser, else the first.
        const preferred =
            entry.installUrls.find((u) => u.platform === this.platform) ??
            entry.installUrls[0]

        const item = el('div', '', {
            class: 'wallet-picker-item wallet-suggested-item',
        })

        const main = el('button', '', {
            class: 'wallet-picker-item-main',
            type: 'button',
        })

        const icon = el('span', '', { class: 'wallet-icon' })
        if (entry.icon) {
            icon.appendChild(
                el('img', '', { src: entry.icon, alt: entry.name })
            )
        } else {
            icon.innerHTML = BROWSER_ICON
        }

        const info = el('div', '', { class: 'wallet-info' })
        info.appendChild(el('h3', entry.name))

        const badge = el(
            'span',
            preferred ? `Get for ${preferred.platform}` : 'Get',
            { class: 'wallet-get-badge' }
        )

        main.append(icon, info, badge)

        if (preferred?.url) {
            main.addEventListener('click', () => {
                window.open(preferred.url, '_blank', 'noopener')
            })
        }

        item.appendChild(main)
        return item
    }

    private renderGateway(): HTMLElement {
        const container = el('div', '', { class: 'gateway-view' })
        container.appendChild(
            el('p', 'Enter the URL of your Remote Wallet.', {
                class: 'gateway-help',
            })
        )

        const input = el('input', '', {
            class: 'custom-url-input',
            type: 'url',
            'aria-label': 'Remote Wallet URL',
            placeholder: 'https://wallet.example.com',
        }) as HTMLInputElement

        const button = el('button', 'Connect', {
            class: 'gateway-connect-button',
            type: 'button',
        }) as HTMLButtonElement
        button.disabled = true

        const parse = (value: string): URL | undefined => {
            const trimmed = value.trim()
            if (!trimmed) return undefined
            try {
                const normalized = /^https?:\/\//i.test(trimmed)
                    ? trimmed
                    : `https://${trimmed}`
                return new URL(normalized)
            } catch {
                return undefined
            }
        }

        const connect = () => {
            const parsed = parse(input.value)
            if (!parsed) return
            const normalizedUrl = parsed.toString()
            this.select({
                providerId: `custom:remote:${encodeURIComponent(normalizedUrl)}`,
                name: parsed.hostname || 'Custom URL',
                type: 'remote',
                url: normalizedUrl,
                reuseGlobalWalletPopup: false,
            })
        }

        input.addEventListener('input', () => {
            button.disabled = !parse(input.value)
        })
        input.addEventListener('keydown', (e) => {
            if ((e as KeyboardEvent).key === 'Enter' && parse(input.value)) {
                e.preventDefault()
                connect()
            }
        })
        button.addEventListener('click', connect)

        container.append(input, button)
        queueMicrotask(() => input.focus())
        return container
    }

    private renderConnecting(): HTMLElement {
        const container = el('div', '', { class: 'walletconnect-view' })

        if (this.isWalletConnect()) {
            if (this.wcQrDataUrl) {
                container.appendChild(
                    el('img', '', {
                        class: 'walletconnect-qr',
                        src: this.wcQrDataUrl,
                        alt: 'WalletConnect QR code',
                    })
                )
            } else {
                const placeholder = el('div', '', {
                    class: 'walletconnect-qr walletconnect-qr-placeholder',
                })
                placeholder.appendChild(
                    el('div', '', { class: 'walletconnect-spinner' })
                )
                container.appendChild(placeholder)
            }

            const divider = el('div', '', { class: 'walletconnect-divider' })
            divider.appendChild(
                el('span', 'Or', { class: 'walletconnect-divider-label' })
            )
            container.appendChild(divider)

            const copyBtn = el(
                'button',
                this.copied ? 'Copied!' : 'Copy link',
                {
                    class: 'walletconnect-copy-button',
                    type: 'button',
                }
            ) as HTMLButtonElement
            copyBtn.disabled = !this.wcUri
            copyBtn.addEventListener('click', async () => {
                if (!this.wcUri) return
                try {
                    await navigator.clipboard.writeText(this.wcUri)
                    this.copied = true
                    this.render()
                    setTimeout(() => {
                        this.copied = false
                        if (!this.destroyed && this.state === 'connecting') {
                            this.render()
                        }
                    }, 2000)
                } catch {
                    // ignore clipboard failures
                }
            })
            container.appendChild(copyBtn)
            return container
        }

        const loading = el('div', '', { class: 'connecting-loading' })
        const ring = el('div', '', { class: 'connecting-spinner-ring' })
        const avatar = el('span', '', { class: 'connecting-avatar' })
        if (this.selectedIcon) {
            avatar.appendChild(
                el('img', '', {
                    src: this.selectedIcon,
                    alt: this.selected?.name ?? 'wallet',
                })
            )
        } else {
            avatar.appendChild(
                el(
                    'span',
                    (this.selected?.name ?? 'W').charAt(0).toUpperCase(),
                    { class: 'connecting-avatar-fallback' }
                )
            )
        }
        ring.appendChild(avatar)
        loading.appendChild(ring)
        loading.appendChild(
            el('h3', `Connecting to ${this.selected?.name ?? 'wallet'}`, {
                class: 'walletconnect-title',
            })
        )
        loading.appendChild(
            el('p', 'Approve the connection in your wallet to continue.', {
                class: 'walletconnect-help',
            })
        )
        container.appendChild(loading)
        return container
    }

    private renderFooter(): HTMLElement {
        const footer = el('div', '', { class: 'discovery-modal-footer' })
        const link = el('a', '', {
            class: 'discovery-modal-no-wallet',
            href: 'https://github.com/canton-foundation/wallets/blob/main/WALLET_DIRECTORY.md',
            target: '_blank',
            rel: 'noopener',
        })
        link.innerHTML =
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2.5" stroke="currentColor" stroke-width="1.8"/><path d="M3 9.5h12a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2H3" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="15" cy="13" r="1.1" fill="currentColor"/></svg>'
        link.appendChild(
            el('span', 'Need a wallet?', {
                class: 'discovery-modal-no-wallet-label',
            })
        )
        footer.appendChild(link)
        return footer
    }
}

let active: WalletPickerModalController | null = null

/**
 * Opens the in-page wallet picker modal and resolves with the user's first
 * selection. Subsequent retries after a failed connection are obtained via
 * {@link waitForWalletPickerModalRetrySelection}.
 */
export async function pickWalletModal(
    entries: WalletPickerEntry[]
): Promise<WalletPickerResult> {
    active?.destroy()
    active = new WalletPickerModalController(entries)
    return active.awaitSelection()
}

/** Closes the modal after a successful connection. */
export function notifyWalletPickerModalConnected(): void {
    active?.setConnected()
}

/** Shows an error in the modal and returns the user to the wallet list. */
export function notifyWalletPickerModalError(message: string): void {
    active?.setError(message)
}

/** Resolves with the next selection after an error; rejects if the modal was closed. */
export async function waitForWalletPickerModalRetrySelection(): Promise<WalletPickerResult> {
    if (!active || !active.isActive()) {
        throw new Error('Wallet picker is not open')
    }
    return active.awaitSelection()
}

/**
 * Resolves when the user clicks "back" from the connecting view. The SDK races
 * this against the in-flight connection so it can abort the attempt and re-await
 * a selection. If no modal is active it never resolves (loses the race).
 */
export function waitForWalletPickerModalBack(): Promise<void> {
    if (!active || !active.isActive()) {
        return new Promise<void>(() => {})
    }
    return active.awaitBack()
}

/** Feeds a WalletConnect pairing URI (and optional QR data URL) into the connecting view. */
export function setWalletPickerModalWalletConnectUri(
    uri: string,
    qrDataUrl?: string
): void {
    active?.setWalletConnectUri(uri, qrDataUrl)
}

/** Forces the modal color scheme, or `'auto'` to follow `prefers-color-scheme`. */
export type WalletPickerModalTheme = 'light' | 'dark' | 'auto'

let modalTheme: WalletPickerModalTheme = 'auto'

/**
 * Sets the color scheme used by the in-page modal picker. Applies immediately
 * to an open modal and to any opened later. `'auto'` follows the OS setting.
 */
export function setWalletPickerModalTheme(theme: WalletPickerModalTheme): void {
    modalTheme = theme
    active?.applyTheme(theme)
}

const LIGHT_TOKENS = `
    --accent: #111111;
    --accent-hover: #000000;
    --accent-contrast: #ffffff;
    --accent-soft: rgba(17, 17, 17, 0.06);
    --border: #ececf3;
    --border-hover: #d3d3e0;
    --surface: #ffffff;
    --surface-2: #f4f4f7;
    --surface-hover: #ebebf0;
    --text: #373737;
    --text-muted: #6b7280;
    --icon-muted: #999999;
    --scrollbar: #d4d4dc;
    --success: #4e9e73;
    --success-soft: rgba(78, 158, 115, 0.14);
    --danger: #dc2626;
    --danger-text: #b91c1c;
    --danger-soft: rgba(220, 38, 38, 0.08);
    --danger-soft-hover: rgba(220, 38, 38, 0.1);
    --backdrop: rgba(71, 88, 107, 0.24);
    --fade-shadow: rgba(15, 23, 42, 0.18);
    --shadow-modal:
        0 12px 32px -18px rgba(15, 23, 42, 0.12),
        0 2px 8px -6px rgba(15, 23, 42, 0.06);
`

const DARK_TOKENS = `
    --accent: #f4f4f6;
    --accent-hover: #e2e2e6;
    --accent-contrast: #16171b;
    --accent-soft: rgba(255, 255, 255, 0.08);
    --border: #2b2d34;
    --border-hover: #3b3e47;
    --surface: #17181c;
    --surface-2: #202228;
    --surface-hover: #2a2c33;
    --text: #e7e7ea;
    --text-muted: #9aa0aa;
    --icon-muted: #8a8f99;
    --scrollbar: #3b3e47;
    --success: #6ac394;
    --success-soft: rgba(106, 195, 148, 0.16);
    --danger: #f26d6d;
    --danger-text: #f4a3a3;
    --danger-soft: rgba(242, 109, 109, 0.12);
    --danger-soft-hover: rgba(242, 109, 109, 0.16);
    --backdrop: rgba(0, 0, 0, 0.5);
    --fade-shadow: rgba(0, 0, 0, 0.5);
    --shadow-modal:
        0 12px 32px -18px rgba(0, 0, 0, 0.4),
        0 2px 8px -6px rgba(0, 0, 0, 0.24);
`

const MODAL_CSS = `
:host {
    all: initial;
}

.discovery-modal-backdrop {
${LIGHT_TOKENS}
    position: fixed;
    inset: 0;
    background: var(--backdrop);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    z-index: 2147483000;
    animation: swkFadeIn 0.2s ease-out;
    font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial,
        sans-serif;
}

@keyframes swkFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

.discovery-modal-content {
    position: relative;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    box-shadow: var(--shadow-modal);
    width: min(87.4vw, 342px);
    overflow: hidden;
    animation: swkSlideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}

.discovery-modal-inner {
    width: min(87.4vw, 342px);
    max-height: min(86vh, 640px);
    display: flex;
    flex-direction: column;
}

@keyframes swkSlideUp {
    from { transform: translateY(16px) scale(0.98); opacity: 0; }
    to { transform: translateY(0) scale(1); opacity: 1; }
}

.discovery-modal-content button {
    box-sizing: border-box;
    font-family: inherit;
}

.discovery-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 24px 20px 16px;
}

.discovery-modal-heading {
    flex: 1;
    min-width: 0;
    text-align: left;
}

.discovery-modal-heading h2 {
    margin: 0;
    font-size: 17px;
    line-height: 32px;
    font-weight: 600;
    color: var(--text);
}

.discovery-modal-back,
.discovery-modal-close {
    flex-shrink: 0;
    background: transparent;
    border: none;
    padding: 0;
    cursor: pointer;
    color: var(--icon-muted);
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition:
        background 0.15s ease,
        color 0.15s ease,
        transform 0.15s ease;
}

.discovery-modal-back svg,
.discovery-modal-close svg {
    display: block;
}

.discovery-modal-back:hover,
.discovery-modal-close:hover {
    background: var(--surface-hover);
    color: var(--text);
}

.discovery-modal-back:active,
.discovery-modal-close:active {
    transform: scale(0.92);
}

.discovery-modal-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 4px 20px 10px;
    scrollbar-width: thin;
    scrollbar-color: var(--scrollbar) transparent;
}

.discovery-modal-body::-webkit-scrollbar {
    width: 8px;
}

.discovery-modal-body::-webkit-scrollbar-thumb {
    background: var(--scrollbar);
    border-radius: 4px;
    border: 2px solid var(--surface);
}

.discovery-modal-view {
    animation: swkViewFade 0.25s ease;
}

@keyframes swkViewFade {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
}

.discovery-modal-error {
    margin: 0 0 12px;
    padding: 10px 12px;
    border-radius: 12px;
    background: var(--danger-soft);
    color: var(--danger-text);
    font-size: 13px;
    line-height: 1.4;
}

.wallet-picker-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
    /* Show ~4.5 wallet rows (62px tall + 8px gap), then scroll. Only this
       list scrolls; the header and footer stay fixed. */
    max-height: calc(4.5 * 62px + 4 * 8px);
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--scrollbar) transparent;
    padding-right: 4px;
    margin-right: -4px;
}

.wallet-picker-container::-webkit-scrollbar {
    width: 8px;
}

.wallet-picker-container::-webkit-scrollbar-thumb {
    background: var(--scrollbar);
    border-radius: 4px;
    border: 2px solid var(--surface);
}

/* Non-scrolling wrapper so the fade can sit at the list's viewport bottom. */
.wallet-picker-scroll {
    position: relative;
}

/* Fading divider pinned to the bottom of the scroll viewport to hint at more
   content below. Purely visual; clicks pass through to the row beneath. */
.wallet-picker-fade {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 22px;
    z-index: 10;
    pointer-events: none;
    /* Inset shadow anchored to the bottom edge: reads as a shadowed border and
       stays clipped within this overlay so it never creeps onto the row above. */
    box-shadow: inset 0 -10px 10px -9px var(--fade-shadow);
    transition: opacity 300ms;
}

/* Mirror of the bottom fade, anchored to the top edge (content scrolled above). */
.wallet-picker-fade-top {
    top: 0;
    bottom: auto;
    box-shadow: inset 0 10px 10px -9px var(--fade-shadow);
}

/* Hidden once the list fits or is scrolled to the bottom (no more content). */
.wallet-picker-fade.is-hidden {
    opacity: 0;
}

.wallet-picker-item {
    display: flex;
    align-items: stretch;
    flex-shrink: 0;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    overflow: hidden;
    transition:
        border-color 0.15s ease,
        background 0.15s ease,
        box-shadow 0.15s ease,
        transform 0.1s ease;
}

.wallet-picker-item-main {
    display: flex;
    align-items: center;
    gap: 14px;
    flex: 1;
    min-width: 0;
    padding: 14px 16px;
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
    width: 100%;
}

.wallet-picker-item:hover {
    background: var(--accent-soft);
    border-color: var(--border-hover);
}

.wallet-picker-item:active {
    transform: scale(0.985);
}

.wallet-picker-remove {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    align-self: center;
    width: 32px;
    height: 32px;
    padding: 0;
    margin: 0 8px 0 0;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    transition:
        background 0.15s ease,
        color 0.15s ease;
}

.wallet-picker-remove:hover {
    background: var(--danger-soft-hover);
    color: var(--danger);
}

.wallet-icon {
    width: 32px;
    height: 32px;
    border-radius: 22.5%;
    flex-shrink: 0;
    background: var(--surface-2);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    color: var(--text-muted);
}

.wallet-icon img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.wallet-icon-fallback {
    font-size: 17px;
    font-weight: 600;
    color: var(--accent);
}

.wallet-info {
    flex: 1;
    min-width: 0;
}

.wallet-info h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.wallet-installed-badge {
    flex-shrink: 0;
    margin-left: auto;
    font-size: 12px;
    font-weight: 600;
    line-height: 1;
    padding: 3px 8px;
    border-radius: 999px;
    color: var(--success);
    background: var(--success-soft);
}

/* Plain text label revealed on row hover; the whole row is the install target. */
.wallet-get-badge {
    flex-shrink: 0;
    margin-left: auto;
    font-size: 12px;
    font-weight: 600;
    line-height: 1;
    color: var(--text-muted);
    white-space: nowrap;
    opacity: 0;
    transition: opacity 0.15s ease;
}

.wallet-picker-item:hover .wallet-get-badge,
.wallet-picker-item:focus-within .wallet-get-badge {
    opacity: 1;
}

.custom-url-input {
    width: 100%;
    box-sizing: border-box;
    height: 40px;
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 0 12px;
    font-size: 14px;
    color: var(--text);
    background: var(--surface);
}

.custom-url-input:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
    border-color: var(--accent);
}

.gateway-view {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 8px 4px 4px;
}

.gateway-help {
    margin: 0;
    font-size: 14px;
    font-weight: 400;
    color: var(--text-muted);
    text-align: left;
}

.gateway-connect-button {
    width: 100%;
    height: 44px;
    border: 1px solid var(--accent);
    border-radius: 12px;
    padding: 0 14px;
    background: var(--accent);
    color: var(--accent-contrast);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition:
        background 0.15s ease,
        border-color 0.15s ease,
        opacity 0.15s ease;
}

.gateway-connect-button:hover {
    background: var(--accent-hover);
    border-color: var(--accent-hover);
}

.gateway-connect-button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
}

.discovery-modal-footer {
    padding: 10px 20px 16px;
    background: var(--surface);
    text-align: center;
}

.discovery-modal-no-wallet {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 14px;
    line-height: 1;
    font-weight: 500;
    color: var(--text-muted);
    text-decoration: none;
    transition: color 0.15s ease;
}

.discovery-modal-no-wallet svg {
    display: block;
    flex-shrink: 0;
}

.discovery-modal-no-wallet-label {
    display: block;
    transform: translateY(1px);
}

.discovery-modal-no-wallet:hover {
    color: var(--accent);
    text-decoration: underline;
}

.walletconnect-view {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 24px 20px 8px;
    gap: 8px;
}

.connecting-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 18px;
    padding: 28px 16px 16px;
}

.connecting-spinner-ring {
    position: relative;
    width: 92px;
    height: 92px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.connecting-spinner-ring::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 26px;
    padding: 3px;
    background: conic-gradient(
        from var(--swk-spinner-angle),
        var(--accent) 0deg,
        var(--accent-soft) 70deg,
        var(--accent-soft) 360deg
    );
    -webkit-mask:
        linear-gradient(#fff 0 0) content-box,
        linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask:
        linear-gradient(#fff 0 0) content-box,
        linear-gradient(#fff 0 0);
    mask-composite: exclude;
    animation: swkSpinnerAngle 0.9s linear infinite;
}

@keyframes swkSpinnerAngle {
    to { --swk-spinner-angle: 360deg; }
}

.connecting-avatar {
    width: 72px;
    height: 72px;
    border-radius: 22.5%;
    overflow: hidden;
    background: var(--surface-2);
    display: flex;
    align-items: center;
    justify-content: center;
}

.connecting-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.connecting-avatar-fallback {
    font-size: 28px;
    font-weight: 700;
    color: var(--accent);
}

.walletconnect-qr {
    width: 220px;
    height: 220px;
    border-radius: 16px;
    display: block;
    margin: 0 auto 8px;
    padding: 12px;
    box-sizing: border-box;
    background: #ffffff;
    border: 1px solid var(--border);
    box-shadow: 0 8px 24px -12px rgba(15, 23, 42, 0.25);
}

.walletconnect-qr-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--surface-2);
}

.walletconnect-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text);
}

.walletconnect-divider {
    position: relative;
    width: 100%;
    height: 1px;
    background: var(--border);
    margin: 16px 0 12px;
}

.walletconnect-divider-label {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 0 10px;
    background: var(--surface);
    color: var(--text-muted);
    font-size: 12px;
    font-weight: 600;
    line-height: 1;
}

.walletconnect-copy-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    margin-top: 6px;
    padding: 12px 20px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: var(--surface-2);
    color: var(--text);
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    transition:
        background 0.15s ease,
        border-color 0.15s ease,
        transform 0.1s ease;
}

.walletconnect-copy-button svg {
    display: block;
}

.walletconnect-copy-button:hover:not(:disabled) {
    background: var(--surface-hover);
    border-color: var(--border-hover);
}

.walletconnect-copy-button:disabled {
    opacity: 0.5;
    cursor: progress;
}

.walletconnect-spinner {
    width: 36px;
    height: 36px;
    border: 3px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: swkWcSpin 0.8s linear infinite;
}

.walletconnect-help {
    margin: 0;
    font-size: 14px;
    color: var(--text-muted);
}

@keyframes swkWcSpin {
    to { transform: rotate(360deg); }
}

@media (prefers-color-scheme: dark) {
    .discovery-modal-backdrop {
${DARK_TOKENS}
    }
}

/* Explicit theme override (wins over the OS setting via prefers-color-scheme). */
:host([data-swk-theme='dark']) .discovery-modal-backdrop {
${DARK_TOKENS}
}

:host([data-swk-theme='light']) .discovery-modal-backdrop {
${LIGHT_TOKENS}
}

@media (max-width: 600px) {
    .discovery-modal-backdrop {
        align-items: flex-end;
        padding: 0;
    }

    .discovery-modal-content {
        width: 100vw;
        max-height: 88vh;
        border-radius: 20px 20px 0 0;
    }

    .discovery-modal-inner {
        width: 100vw;
    }
}
`
