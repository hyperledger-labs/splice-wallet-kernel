export class Discovery extends HTMLElement {
    constructor() {
        super()
    }

    connectedCallback() {
        const shadow = this.attachShadow({ mode: 'open' })

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

        shadow.appendChild(header)
        shadow.appendChild(input)
        shadow.appendChild(button)
    }
}
