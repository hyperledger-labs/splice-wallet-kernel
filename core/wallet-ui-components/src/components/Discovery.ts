// Discovery implements the view of the Wallet Kernel selection window. It is implemented directly as a Web Component without using LitElement, so to avoid having external dependencies.
export class Discovery extends HTMLElement {
    constructor() {
        super()
    }

    connectedCallback() {
        const shadow = this.attachShadow({ mode: 'open' })

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

        input {
            margin-left: 8px;
        }
        `

        const root = document.createElement('div')

        const header = document.createElement('h1')
        header.innerText = 'Add Remote Wallet Kernel'

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
            console.log('Connecting to Wallet Kernel...' + url)
            window.opener.postMessage({ url, walletType: 'remote' }, '*')
        })

        shadow.appendChild(styles)

        root.appendChild(header)
        root.appendChild(input)
        root.appendChild(button)

        shadow.appendChild(root)
    }
}

customElements.define('swk-discovery', Discovery)
