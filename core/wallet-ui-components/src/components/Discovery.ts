// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { DiscoverResult, SpliceMessageEvent } from '@canton-network/core-types'

/**
 * Discovery implements the view of the Wallet Gateway selection window.
 * It is implemented directly as a Web Component without using LitElement, so to avoid having external dependencies.
 */
export class Discovery extends HTMLElement {
    static observedAttributes = ['wallet-extension-loaded']

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
        styles.textContent = `
        * {
            color: var(--splice-wk-text-color, black);
            font-family: var(--splice-wk-font-family);
        }

        h1 {
            margin: 0px;
        }

        div {
            background-color: var(--splice-wk-background-color, none);
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
        `

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

        const button = document.createElement('button')
        button.innerText = `Connect`
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

    render() {
        const root = document.createElement('div')

        const header = document.createElement('h1')
        header.innerText = 'Add a Wallet Gateway'

        const input = document.createElement('input')
        input.setAttribute('autofocus', '')
        input.setAttribute('id', 'wkurl')
        input.setAttribute('type', 'text')
        input.setAttribute('placeholder', 'RPC URL')

        const button = document.createElement('button')
        button.setAttribute('id', 'connect')
        button.innerText = 'Connect'
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
