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

let globalPopupInstance: WindowProxy | undefined

class PopupInstance {
    static getInstance() {
        if (!globalPopupInstance || globalPopupInstance.closed) {
            console.log('[PopupInstance] Creating new global popup instance')
            const win = window.open(
                '',
                'wallet-popup',
                `width=400,height=500,screenX=200,screenY=200`
            )
            if (!win) throw new Error('Failed to open popup window')
            globalPopupInstance = win
        }
        return globalPopupInstance
    }

    constructor() {
        // TODO: remove this, b/c we cannot distinguish between page closed vs page reloaded.
        // A possible solution is to send a periodic heartbeat message from the parent to the popup,
        // and close the popup if it doesn't respond within a certain time frame.
        window.addEventListener('beforeunload', () => {
            if (globalPopupInstance) {
                console.log('[PopupInstance] Closing popup instance on unload')
                globalPopupInstance.close()
                globalPopupInstance = undefined
            }
        })
    }

    open(url: string | URL): WindowProxy
    open(component: StyledElement, options?: PopupOptions): WindowProxy
    open(
        urlOrComponent: string | URL | StyledElement,
        options?: PopupOptions
    ): WindowProxy {
        if (
            typeof urlOrComponent === 'string' ||
            urlOrComponent instanceof URL
        ) {
            const win = PopupInstance.getInstance()
            win.location.href = urlOrComponent.toString()
            win.focus()
            return win
        } else {
            const componentUrl = this.getComponentUrl(urlOrComponent, options)
            const win = PopupInstance.getInstance()
            win.location.href = componentUrl
            win.focus()
            return win
        }
    }

    close() {
        console.log('[PopupInstance] Closing popup instance')
        if (globalPopupInstance) globalPopupInstance.close()
    }

    private getComponentUrl(
        component: StyledElement,
        options?: PopupOptions
    ): string {
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

            URL.revokeObjectURL(window.location.href)
        </script>
    </html>`

        return URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    }
}

export const popup = new PopupInstance()
