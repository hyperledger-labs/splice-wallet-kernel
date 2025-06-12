const winHtml = `<!DOCTYPE html>
    <html>
        <head>
            <title>Wallet Kernel</title>
        </head>
        <body>
            <h1>Add Remote Wallet Kernel</h1>
            <input autofocus id="wkurl" type="text" placeholder="RPC URL" />
            <button id="connect">Connect</button>
        </body>

        <script>
            const button = document.getElementById('connect')
            button.addEventListener('click', () => {
                const url = document.getElementById('wkurl').value

                console.log('Connecting to Wallet Kernel...' + url)
                window.opener.postMessage({ url, walletType: 'remote' }, '*')
            })
        </script>
    </html>`

const winUrl = URL.createObjectURL(new Blob([winHtml], { type: 'text/html' }))

import { createPopup } from 'wallet-ui-discovery'

interface DiscoverResult {
    walletType: 'extension' | 'remote'
    url: string
}

export async function discover(): Promise<DiscoverResult> {
    return new Promise((resolve, reject) => {
        let response: DiscoverResult | undefined = undefined

        createPopup('external popup')

        const win = window.open(
            winUrl,
            'discovery2',
            `width=400,height=500,screenX=200,screenY=200`
        )

        win?.addEventListener('beforeunload', () => {
            if (response === undefined) {
                console.log('Wallet discovery window closed by user')
                reject('User closed the wallet discovery window')
            }
        })

        const handler = (event: MessageEvent) => {
            if (event.origin === window.location.origin) {
                response = event.data
                resolve({
                    url: event.data.url,
                    walletType: event.data.walletType,
                })
                window.removeEventListener('message', handler)
                win?.close()
            }
        }

        window.addEventListener('message', handler)
    })
}
