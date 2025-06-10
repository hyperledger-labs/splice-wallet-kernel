const winHtml = `<!DOCTYPE html>
    <html>
        <head>
            <title>Wallet Kernel</title>
        </head>
        <body>
            <h1>Connect to a Wallet Kernel</h1>
            <input autofocus id="wkurl" type="text" placeholder="Wallet Kernel RPC URL" />
            <button id="connect">Connect</button>
        </body>

        <script>
            const button = document.getElementById('connect')
            button.addEventListener('click', () => {
                const url = document.getElementById('wkurl').value

                console.log('Connecting to Wallet Kernel...' + url)
                window.opener.postMessage({ url }, '*')
            })
        </script>
    </html>`

const winUrl = URL.createObjectURL(new Blob([winHtml], { type: 'text/html' }))

type WalletDiscoveryResult = {
    type: 'rpc'
    url: string
}

interface Data {
    url: string
}

export async function discoverWallets(): Promise<WalletDiscoveryResult[]> {
    return new Promise((resolve, reject) => {
        let response: Data | undefined = undefined

        const win = window.open(
            winUrl,
            'win',
            `width=400,height=500,screenX=200,screenY=200`
        )

        // win?.addEventListener('unload', () => {
        //     if (response === undefined) {
        //         console.log('Wallet discovery window closed by user')
        //         reject('User closed the wallet discovery window')
        //     }
        // })

        const handler = (event: MessageEvent) => {
            console.log('Received message from wallet kernel:', event)
            if (event.origin === window.location.origin) {
                response = event.data
                resolve([{ type: 'rpc', url: event.data.url }])
                window.removeEventListener('message', handler)
                win?.close()
            }
        }

        window.addEventListener('message', handler)
    })
}
