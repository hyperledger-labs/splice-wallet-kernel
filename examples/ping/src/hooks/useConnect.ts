import { useEffect, useState } from 'react'
import * as sdk from '@canton-network/dapp-sdk'

/**
 * React hook that manages the connection to the wallet gateway.
 * Uses the dapp-sdk to connect and disconnect, and updates the connection status.
 *
 * @returns { connect, disconnect, status }
 */
export function useConnect(): {
    connect: () => Promise<void>
    disconnect: () => Promise<void>
    status?: sdk.dappAPI.StatusEvent
} {
    const [status, setStatus] = useState<sdk.dappAPI.StatusEvent>()

    async function connect() {
        sdk.connect()
            .then((status) => {
                setStatus(status)
            })
            .catch((err) => {
                console.error('Error connecting to wallet:', err)
                throw err
            })
    }

    async function disconnect() {
        sdk.disconnect().then(() => {
            setStatus(undefined)
        })
    }

    useEffect(() => {
        sdk.status()
            .then(setStatus)
            .catch(() => {
                setStatus(undefined)
            })
    }, [])

    useEffect(() => {
        if (status?.isConnected) {
            const onStatusChanged = (status: sdk.dappAPI.StatusEvent) => {
                setStatus(status)
            }

            sdk.onStatusChanged(onStatusChanged)

            return () => {
                sdk.removeOnStatusChanged(onStatusChanged)
            }
        }
    }, [status])

    return {
        connect,
        disconnect,
        status,
    }
}
