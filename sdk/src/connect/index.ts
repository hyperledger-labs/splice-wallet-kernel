import { discover } from './discovery'
import { injectSpliceProvider } from 'splice-provider'
export * from 'splice-provider'

export enum ErrorCode {
    UserCancelled,
    Other,
}

type ConnectResult = {
    status: 'success'
    url: string
}

export type ConnectError = {
    status: 'error'
    error: ErrorCode
    details: string
}

export async function connect(): Promise<ConnectResult> {
    return discover()
        .then((result) => {
            if (result.walletType === 'remote') {
                const provider = injectSpliceProvider()

                // TODO: Replace with actual connection logic
                setTimeout(() => {
                    provider.emit('connect', {
                        chainId: 'TODO: replace with hex chain ID?',
                    })
                }, 1000)
            }

            return {
                status: 'success',
                url: result.url,
            } as ConnectResult
        })
        .catch((err) => {
            throw {
                status: 'error',
                error: ErrorCode.Other,
                details: err instanceof Error ? err.message : String(err),
            } as ConnectError
        })
}
