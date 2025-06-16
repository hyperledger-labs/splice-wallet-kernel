interface PopupOptions {
    title?: string
    target?: string
    width?: number
    height?: number
    screenX?: number
    screenY?: number
    onBeforeUnload?: () => void
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
        onBeforeUnload,
    } = options || {}

    const html = `<!DOCTYPE html>
    <html>
        <head>
            <title>${title}</title>
        </head>
        <body>
            <div id="pop-root"></div>
        </body>

        <script>
            customElements.define('popup-content', ${component})

            const root = document.getElementById('pop-root')
            root.appendChild(document.createElement('popup-content'))
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
                onBeforeUnload?.()
            })
            resolve(win)
        } else {
            reject(new Error('Failed to open popup window.'))
        }
    })
}
