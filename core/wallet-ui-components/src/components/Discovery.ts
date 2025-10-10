// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    DiscoverResult,
    SpliceMessageEvent,
    GatewaysConfig,
} from '@canton-network/core-types'
import { css } from 'lit'
import { BaseElement } from '../internal/BaseElement'
import { cssToString } from '../utils'

const SUBSTITUTABLE_CSS = cssToString([
    BaseElement.styles,
    css`
        * {
            color: var(--wg-theme-text-color, black);
            font-family: var(--wg-theme-font-family);
        }

        .root {
            background-color: var(--wg-theme-background-color, none);
            width: 100%;
            height: 100%;
        }

        .wrapper {
            margin: 0 auto;
            max-width: 90%;
            padding: 20px 12px;
        }

        h3 {
            text-align: center;
            margin: 20px;
        }

        .kernel {
            gap: 8px;
        }

        .nav-link {
            cursor: pointer;
        }
    `,
])

/**
 * Discovery implements the view of the Wallet Gateway selection window.
 *
 * This component is a special case. It does not use Lit or BaseElement, because it is intended to be injected directly into client-side popup windows.
 * This has some implications about how styles are handled. We want to rely on the same base styles as BaseElement, but do not want to depend on the Lit runtime.
 *
 * Therefore, we define the styles as a string constant (SUBSTITUTABLE_CSS), and inject them into the shadow DOM manually.
 */
export class Discovery extends HTMLElement {
    static observedAttributes = ['wallet-extension-loaded']

    static styles = SUBSTITUTABLE_CSS

    get walletExtensionLoaded() {
        return this.hasAttribute('wallet-extension-loaded')
    }

    set walletExtensionLoaded(val) {
        if (val) {
            this.setAttribute('wallet-extension-loaded', '')
        } else {
            this.removeAttribute('wallet-extension-loaded')
        }
    }

    private root: HTMLElement
    private selectedTabId: string = 'tab-1'
    private verifiedKernelsa: GatewaysConfig[] = []

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })

        const styles = document.createElement('style')
        styles.textContent = Discovery.styles

        this.root = document.createElement('div')
        this.root.id = 'discovery-root'

        if (this.shadowRoot) {
            this.shadowRoot.appendChild(styles)
            this.shadowRoot.appendChild(this.root)
        }

        if (window.opener) {
            // uses the string literal instead of the WalletEvent enum to avoid bundling issues
            window.opener.postMessage({ type: 'SPLICE_WALLET_EXT_READY' }, '*')
            window.opener.addEventListener(
                'message',
                (event: SpliceMessageEvent) => {
                    if (event.data.type === 'SPLICE_WALLET_EXT_ACK') {
                        this.setAttribute('wallet-extension-loaded', '')
                    }
                }
            )

            window.addEventListener('message', (event) => {
                if (event.data.type === 'SPLICE_WALLET_CONFIG_LOAD') {
                    this.verifiedKernelsa = event.data.payload
                }
            })
        }
    }

    verifiedKernels(): DiscoverResult[] {
        return [
            { url: 'http://localhost:3008/rpc', walletType: 'remote' },
            { url: 'http://localhost:3008/rpc', walletType: 'remote' },
        ]
    }

    tabs() {
        return [
            {
                label: 'Verified',
                id: 'tab-1',
                active: true,
            },
            {
                label: 'Custom url',
                id: 'tab-2',
                active: false,
            },
        ]
    }

    private renderKernelOption(kernel: DiscoverResult) {
        const div = document.createElement('div')
        div.classList =
            'kernel d-flex justify-content-space-between align-items-center flex-wrap mb-3'

        const span = document.createElement('span')

        switch (kernel.walletType) {
            case 'extension':
                span.innerText = 'Browser Extension'
                break
            case 'remote':
                span.innerText = `${kernel.walletType} - ${kernel.url}`
                break
        }

        const button = this.mkButton('Connect', {
            class: 'btn btn-primary',
        })

        button.addEventListener('click', () => {
            this.selectKernel(kernel)
        })

        div.append(span, button)

        return div
    }

    private selectKernel(kernel: DiscoverResult) {
        if (window.opener) {
            window.opener.postMessage(kernel, '*')
        } else {
            console.warn('no window opener...')
        }
    }

    private mkButton(value: string, attrs: Record<string, string> = {}) {
        const button = document.createElement('button')
        button.innerText = value

        Object.entries(attrs).forEach(([key, val]) => {
            button.setAttribute(key, val)
        })

        return button
    }

    render() {
        const root = document.createElement('div')
        root.classList = 'root'

        const wrapper = document.createElement('div')
        wrapper.classList = 'wrapper'

        const header = document.createElement('h3')
        header.innerText = 'Connect to a Wallet Gateway'

        const card = document.createElement('div')
        card.className = 'card'

        const cardHeader = document.createElement('div')
        cardHeader.classList = 'card-header'

        const navTabs = document.createElement('ul')
        navTabs.classList = 'nav nav-tabs card-header-tabs'

        for (const tab of this.tabs()) {
            const li = document.createElement('li')
            li.className = 'nav-item'

            const a = document.createElement('a')
            a.classList = 'nav-link'
            a.textContent = tab.label
            a.dataset.tab = tab.id

            if (tab.id === this.selectedTabId) {
                a.classList.add('active')
            }

            a.addEventListener('click', (e) => {
                e.preventDefault()
                this.selectedTabId = tab.id
                this.render()
            })

            li.appendChild(a)
            navTabs.appendChild(li)
        }

        cardHeader.appendChild(navTabs)

        const cardBody = document.createElement('div')
        cardBody.classList = 'card-body'

        if (this.selectedTabId === 'tab-1') {
            if (this.walletExtensionLoaded) {
                const k = this.renderKernelOption({
                    walletType: 'extension',
                })
                cardBody.appendChild(k)
            }

            for (const kernel of this.verifiedKernels()) {
                const k = this.renderKernelOption(kernel)
                cardBody.appendChild(k)
            }
        } else {
            const div = document.createElement('div')
            div.classList =
                'kernel d-flex justify-content-space-between align-items-center flex-wrap mb-3'
            const input = document.createElement('input')
            input.id = 'wkurl'
            input.type = 'text'
            input.placeholder = 'RPC URL'
            input.classList = 'form-control'

            const button = this.mkButton('Connect', {
                class: 'btn btn-primary',
                id: 'connect',
            })

            button.addEventListener('click', () => {
                const url = input.value
                console.log('Connecting to Wallet Gateway...' + url)
                this.selectKernel({ url, walletType: 'remote' })
            })
            div.append(input, button)
            cardBody.appendChild(div)
        }

        card.append(cardHeader, cardBody)

        wrapper.append(header, card)
        root.appendChild(wrapper)

        // Replace the whole root (except styles), don't append
        if (this.shadowRoot) {
            Array.from(this.shadowRoot.childNodes).forEach((node) => {
                if (!(node instanceof HTMLStyleElement)) {
                    this.shadowRoot!.removeChild(node)
                }
            })
            this.shadowRoot.appendChild(root)
        }
    }

    connectedCallback() {
        this.render()
    }

    attributeChangedCallback() {
        this.render()
    }
}

customElements.define('swk-discovery', Discovery)
