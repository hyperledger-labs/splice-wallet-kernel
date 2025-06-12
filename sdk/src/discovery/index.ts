import { createPopup } from './Popup'

interface DiscoverResult {
    kind: 'discoveryMessage'
    walletType: 'extension' | 'remote'
    url: string
}

export const discover = (): Promise<Omit<DiscoverResult, 'kind'>> => {
    return new Promise((resolve, reject) => {
        let response: DiscoverResult | undefined = undefined

        const pop = createPopup(
            'Wallet UI Discovery',
            () => {
                if (response === undefined) {
                    console.log('Wallet discovery window closed by user')
                    reject('User closed the wallet discovery window')
                }
            },
            { target: 'discovery' }
        )

        const handler = (event: MessageEvent<DiscoverResult>) => {
            if (
                event.origin === window.location.origin &&
                event.data.kind === 'discoveryMessage'
            ) {
                console.log('Received message from popup:', event.data)
                response = event.data
                resolve({
                    url: event.data.url,
                    walletType: event.data.walletType,
                })
                window.removeEventListener('message', handler)
                pop?.close()
            }
        }

        window.addEventListener('message', handler)
    })
}
