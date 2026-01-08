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

    return new Promise((resolve) => {
        const win = WindowState.getInstance()
        win.location.href = url
        win.focus()

        resolve(win)
    })
}

export function popupHref(url: URL | string): Promise<Window> {
    const win = WindowState.getInstance()
    win.location.href = url.toString()

    return new Promise((resolve, reject) => {
        if (win) {
            win.focus()
            resolve(win)
        } else {
            reject(new Error('Failed to open popup window.'))
        }
    })
}
