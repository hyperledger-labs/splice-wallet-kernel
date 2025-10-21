// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

interface PopupOptions {
    title?: string
    target?: string
    width?: number
    height?: number
    screenX?: number
    screenY?: number
}

interface StyledElement {
    new (): HTMLElement
    styles: string
}

export function popup(
    component: StyledElement,
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

    const sanitizedStyles = component.styles
        .replaceAll('\n', ' ')
        .replaceAll("'", "\\'")
        .replaceAll('"', '\\"')

    let element = component
        .toString()
        .replace('SUBSTITUTABLE_CSS', `'${sanitizedStyles}'`)

    // Ugly hack to workaround the format of the class post-bundling, where static methods are set at runtime for compatibility
    if (sanitizedStyles && !element.includes('static styles')) {
        element = element.replace(
            'constructor() {',
            `static styles = '${sanitizedStyles}';\nconstructor() {`
        )
    }

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
        </head>
        <body>
        </body>

        <script>
            customElements.define('popup-content', ${element})

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
