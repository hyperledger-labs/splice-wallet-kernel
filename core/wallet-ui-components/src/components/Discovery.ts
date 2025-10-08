// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { DiscoverResult, SpliceMessageEvent } from '@canton-network/core-types'
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

        h1 {
            margin: 0px;
        }

        div {
            background-color: var(--wg-theme-background-color, none);
            width: 100%;
            height: 100%;
        }

        .kernel {
            height: auto;
            margin-bottom: 8px;
        }

        .kernel button {
            margin-left: 8px;
        }

        input {
            margin-left: 8px;
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
    }

    verifiedKernels(): DiscoverResult[] {
        return [{ url: 'http://localhost:3008/rpc', walletType: 'remote' }]
    }

    private renderKernelOption(kernel: DiscoverResult) {
        const div = document.createElement('div')
        div.setAttribute('class', 'kernel')

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

        div.appendChild(span)
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

        const header = document.createElement('h3')
        header.innerText = 'Add a Wallet Gateway'

        const input = document.createElement('input')
        input.setAttribute('autofocus', '')
        input.setAttribute('id', 'wkurl')
        input.setAttribute('type', 'text')
        input.setAttribute('placeholder', 'RPC URL')

        const button = this.mkButton('Connect', {
            class: 'btn btn-primary',
            id: 'connect',
        })

        button.addEventListener('click', () => {
            const url = input.value
            console.log('Connecting to Wallet Gateway...' + url)
            this.selectKernel({ url, walletType: 'remote' })
        })

        root.appendChild(header)

        if (this.walletExtensionLoaded) {
            const k = this.renderKernelOption({
                walletType: 'extension',
            })
            root.appendChild(k)
        }

        for (const kernel of this.verifiedKernels()) {
            const k = this.renderKernelOption(kernel)
            root.appendChild(k)
        }

        root.appendChild(input)
        root.appendChild(button)

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
