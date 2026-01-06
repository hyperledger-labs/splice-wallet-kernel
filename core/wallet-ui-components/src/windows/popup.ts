// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
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

    const elementSource = component
        .toString()
        .replace('SUBSTITUTABLE_CSS', `''`)

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
            const Component = (${elementSource});
            Component.styles = \`${sanitizedStyles}\`;

            customElements.define('popup-content', Component);

            const content = document.createElement('popup-content');
            content.style.width = '100%';
            content.style.height = '100%';

            document.body.appendChild(content)
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
