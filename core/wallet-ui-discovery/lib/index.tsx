import { createRoot } from 'react-dom/client'
import { Popup } from './Popup'

export const createPopup = async (title: string) => {
    const html = `
    <!DOCTYPE html>
    <html>
        <head>
            <title>${title}</title>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
        <body>
            <div id="app"></div>
        </body>
    </html>
    `
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))

    const popupWindow = window.open(
        url,
        'discovery',
        'width=400,height=500,screenX=200,screenY=200'
    )

    if (popupWindow) {
        popupWindow.onload = () => {
            const popupRoot = popupWindow.document.getElementById('app')
            createRoot(popupRoot!).render(<Popup />)
        }
    }
}
