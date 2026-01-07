// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { WindowState } from './discovery'

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
    const { title = 'Custom Popup' } = options || {}

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

    return new Promise((resolve) => {
        const win = WindowState.getInstance()
        win.location.href = url
        win.focus()

        resolve(win)
    })
}

export function popupHref(url: URL | string): Promise<Window> {
    return new Promise((resolve, reject) => {
        const win = WindowState.getInstance()
        win.location.href = url.toString()

        if (win) {
            win.focus()
            resolve(win)
        } else {
            reject(new Error('Failed to open popup window.'))
        }
    })
}
