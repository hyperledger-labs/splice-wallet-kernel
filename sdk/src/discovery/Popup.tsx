import { useState } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'

export function Popup() {
    const [rpcUrl, setRpcUrl] = useState('')

    return (
        <div id="root" style={{ backgroundColor: 'lightblue' }}>
            <h1>Select a Wallet Kernel</h1>
            <input
                type="text"
                placeholder="Enter wallet URL"
                value={rpcUrl}
                onChange={(e) => setRpcUrl(e.target.value)}
            />
            <button
                type="submit"
                onClick={() => {
                    console.log('Submitting RPC URL:', rpcUrl, window.opener)
                    window.postMessage(
                        {
                            kind: 'discoveryMessage',
                            url: rpcUrl,
                            walletType: 'remote',
                        },
                        '*'
                    )
                }}
            >
                submit
            </button>
        </div>
    )
}

interface PopupOptions {
    target?: string
    width?: number
    height?: number
    screenX?: number
    screenY?: number
}

export function createPopup(
    title: string,
    onClose: () => void,
    options?: PopupOptions
) {
    const {
        target = '',
        width = 400,
        height = 500,
        screenX = 200,
        screenY = 200,
    } = options || {}

    const html = `
    <!DOCTYPE html>
    <html>
        <head>
            <title>${title}</title>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
        <body>
            <div id="app">${renderToString(<Popup />)}</div>
        </body>
    </html>
    `
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))

    const popupWindow = window.open(
        url,
        target,
        `width=${width},height=${height},screenX=${screenX},screenY=${screenY}`
    )

    if (popupWindow) {
        popupWindow.onbeforeunload = () => {
            onClose()
            URL.revokeObjectURL(url)
        }

        popupWindow.onload = () => {
            const popupRoot = popupWindow.document.getElementById('app')
            hydrateRoot(popupRoot!, <Popup />)
        }
    }

    return popupWindow
}
