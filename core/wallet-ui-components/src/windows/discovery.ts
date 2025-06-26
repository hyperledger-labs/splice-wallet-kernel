import { DiscoverResult } from 'core-types'
import { Discovery } from '../components/Discovery.js'
import { popup } from './popup.js'

export async function discover(): Promise<DiscoverResult> {
    const win = await popup(Discovery, {
        title: 'Wallet Discovery',
    })

    return new Promise((resolve, reject) => {
        let response: DiscoverResult | undefined = undefined

        win.addEventListener('beforeunload', () => {
            if (response === undefined) {
                console.log('Wallet discovery window closed by user')
                reject('User closed the wallet discovery window')
            }
        })

        const handler = (event: MessageEvent) => {
            if (
                event.origin === window.location.origin &&
                typeof event.data.walletType === 'string'
            ) {
                response = event.data
                resolve({
                    url: event.data.url,
                    walletType: event.data.walletType,
                })
                window.removeEventListener('message', handler)
                win.close()
            }
        }

        window.addEventListener('message', handler)
    })
}
