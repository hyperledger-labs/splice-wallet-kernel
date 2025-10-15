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

type KernelType = GatewaysConfig & { walletType: string }

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

        .kernel-content {
            gap: 4px;
        }

        .nav-link {
            cursor: pointer;
        }

        [data-tooltip] {
            position: relative;
        }

        [data-tooltip]::after {
            content: attr(data-tooltip);
            position: absolute;
            transform: translateX(-50%);
            bottom: 0;
            margin-bottom: 8px;
            background: #495057;
            color: var(--black);
            padding: 8px 12px;
            border-radius: 6px;
            pointer-events: none;
            opacity: 0;
            transition: 0.5s;
        }

        [data-tooltip]:hover::after {
            opacity: 1;
            bottom: 100%;
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
    private verifiedKernels?: KernelType[]

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
        }

        window.addEventListener('message', (event) => {
            if (event.data.type === 'SPLICE_WALLET_CONFIG_LOAD') {
                this.verifiedKernels = event.data.payload.map((kernel) => ({
                    ...kernel,
                    walletType: 'remote',
                }))
                this.render()
            }
        })
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

    private renderKernelOption(kernel: KernelType | DiscoverResult) {
        const isRemoteUrl = kernel.walletType === 'remote'
        const div = this.mkElement('div', '', {
            class: 'kernel d-flex justify-content-space-between align-items-center flex-wrap mb-3',
        })

        const button = this.mkElement('button', 'Connect', {
            class: 'btn btn-primary',
        })

        if (isRemoteUrl) {
            button.setAttribute('data-tooltip', kernel.rpcUrl)

            const nameWrapper = this.mkElement('div', '', {
                class: 'kernel-content d-flex',
            })
            const span = this.mkElement('span', kernel.name, {
                class: 'kernel-name',
            })

            // it should be img in the future
            const logo = this.mkElement('span', '(logo)')
            nameWrapper.append(span, logo)
            div.appendChild(nameWrapper)
        } else {
            const span = this.mkElement('span', 'Browser Extension')
            div.appendChild(span)
        }

        button.addEventListener('click', () => {
            this.selectKernel(
                isRemoteUrl
                    ? { url: kernel.rpcUrl, walletType: kernel.walletType }
                    : kernel
            )
        })

        div.appendChild(button)

        return div
    }

    private selectKernel(kernel: DiscoverResult) {
        if (window.opener) {
            window.opener.postMessage(kernel, '*')
        } else {
            console.warn('no window opener...')
        }
    }

    private mkElement<K extends keyof HTMLElementTagNameMap>(
        elementName: K,
        value?: string,
        attrs?: Record<string, string> = {}
    ) {
        const element = document.createElement(elementName)

        if (value) {
            element.innerText = value
        }

        Object.entries(attrs).forEach(([key, val]) => {
            element.setAttribute(key, val)
        })

        return element
    }

    render() {
        const root = this.mkElement('div', '', { class: 'root' })
        const wrapper = this.mkElement('div', '', { class: 'wrapper' })
        const header = this.mkElement('h3', 'Connect to a Wallet Gateway')

        const card = this.mkElement('div', '', { class: 'card' })
        const cardHeader = this.mkElement('div', '', { class: 'card-header' })
        const navTabs = this.mkElement('ul', '', {
            class: 'nav nav-tabs card-header-tabs',
        })

        for (const tab of this.tabs()) {
            const li = this.mkElement('li', '', { class: 'nav-item' })

            const a = this.mkElement('a', tab.label, { class: 'nav-link' })

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

        const cardBody = this.mkElement('div', '', { class: 'card-body' })

        if (this.selectedTabId === 'tab-1') {
            if (this.walletExtensionLoaded) {
                const k = this.renderKernelOption({
                    walletType: 'extension',
                })
                cardBody.appendChild(k)
            }

            if (this.verifiedKernels?.length) {
                for (const kernel of this.verifiedKernels) {
                    const k = this.renderKernelOption(kernel)
                    cardBody.appendChild(k)
                }
            }
        } else {
            const div = this.mkElement('div', '', {
                class: 'kernel d-flex justify-content-space-between align-items-center flex-wrap mb-3',
            })

            const input = this.mkElement('input', '', {
                id: 'wkurl',
                type: 'text',
                placeholder: 'RPC URL',
                class: 'form-control',
            })

            const button = this.mkElement('button', 'Connect', {
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
