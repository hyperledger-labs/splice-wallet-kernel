import styles from '../../themes/default.css?inline'

interface PopupOptions {
    title?: string
    target?: string
    width?: number
    height?: number
    screenX?: number
    screenY?: number
}

export function popup(
    component: new () => HTMLElement,
    options?: PopupOptions
): Promise<Window> {
    const {
        title = 'Custom Popup',
        target = 'wallet-popup',
        width = 400,
        height = 500,
        screenX = 200,
        screenY = 200,
    } = options || {}

    const html = `<!DOCTYPE html>
    <html>
        <head>
            <title>${title}</title>
            <style>
                html, body {
                    margin: 0;
                    padding: 0;
                    width: 100%;
                    height: 100%;
                }

                body {
                    display: flex;
                }
            </style>
            <style>${styles}</style>
        </head>
        <body>
        </body>

        <script>
            customElements.define('popup-content', ${component})

            const root = document.getElementsByTagName('body')[0]

            const content = document.createElement('popup-content')
            content.setAttribute('style', 'width: 100%; height: 100%;')

            root.appendChild(content)
        </script>
    </html>`

    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))

    return new Promise((resolve, reject) => {
        const win = window.open(
            url,
            target,
            `width=${width},height=${height},screenX=${screenX},screenY=${screenY}`
        )

        if (win) {
            win.addEventListener('beforeunload', () => {
                URL.revokeObjectURL(url) // clean up the URL object to prevent memory leaks
            })
            resolve(win)
        } else {
            reject(new Error('Failed to open popup window.'))
        }
    })
}

export function popupHref(
    url: URL | string,
    options?: PopupOptions
): Promise<Window> {
    const {
        target = 'wallet-popup',
        width = 400,
        height = 500,
        screenX = 200,
        screenY = 200,
    } = options || {}

    return new Promise((resolve, reject) => {
        const win = window.open(
            url,
            target,
            `width=${width},height=${height},screenX=${screenX},screenY=${screenY}`
        )

        if (win) {
            win.focus()
            resolve(win)
        } else {
            reject(new Error('Failed to open popup window.'))
        }
    })
}
