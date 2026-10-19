// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useMemo, useState } from 'react'
import * as sdk from '@canton-network/dapp-sdk'
import {
    WalletConnectAdapter,
    setWalletPickerModalWalletConnectUri,
} from '@canton-network/dapp-sdk'
import { handleErrorToast } from '@canton-network/core-wallet-ui-components'

const wcProjectId = import.meta.env.VITE_WC_PROJECT_ID as string
const wcChainId =
    (import.meta.env.VITE_WC_CHAIN_ID as string | undefined) ?? 'canton:testnet'
/**
 * React hook that manages the connection to the wallet gateway.
 * Uses the dapp-sdk to connect and disconnect, and updates the connection status.
 *
 * The wallet picker UI is provided by the SDK's built-in in-page modal, so this
 * hook only needs to register adapters and forward the WalletConnect pairing URI
 * to the modal.
 */
export function useConnect(): {
    connect: () => Promise<void>
    disconnect: () => Promise<void>
    connectResult?: sdk.dappAPI.ConnectResult
} {
    const [connectResult, setConnectResult] =
        useState<sdk.dappAPI.ConnectResult>()

    // Create the WalletConnect adapter once so the same instance is reused for
    // both registration and pre-generating the pairing URI/QR.
    const [wcAdapter] = useState<WalletConnectAdapter | null>(() =>
        wcProjectId
            ? WalletConnectAdapter.create({
                  projectId: wcProjectId,
                  chainId: wcChainId,
                  onUri: setWalletPickerModalWalletConnectUri,
                  openPopupForUri: false,
                  signInWithCanton: {
                      domain: 'http://localhost:3000',
                      uri: 'http://localhost:3000/login',
                      version: '1.0.0',
                      nonce: '1234567890', // optional, defaults to a unique UUID
                  },
                  onSignInWithCanton: (result) => {
                      console.log('onSignInWithCanton:', result)
                  },
              })
            : null
    )
    const additionalAdapters = useMemo(
        () => (wcAdapter ? [wcAdapter] : []),
        [wcAdapter]
    )

    async function connect() {
        await sdk
            .connect()
            .then(setConnectResult)
            .catch((err) => {
                console.error('Error connecting to wallet:', err)
                handleErrorToast(err)
                throw err
            })
    }

    async function disconnect() {
        try {
            await sdk.disconnect()
        } catch (err) {
            console.warn('Error during disconnect:', err)
        }
        setConnectResult(undefined)
    }

    useEffect(() => {
        // No bundled default gateways: the picker only lists gateways the user
        // has actually connected to (persisted recents) plus WalletConnect.
        sdk.init({ defaultAdapters: [], additionalAdapters })
            .then(() => sdk.status())
            .then((s) => setConnectResult(s.connection))
            .catch(() => {
                setConnectResult(undefined)
            })
    }, [additionalAdapters])

    useEffect(() => {
        if (connectResult?.isConnected) {
            console.debug('[use-connect] Adding status changed listener')
            const onStatusChanged = (status: sdk.dappAPI.StatusEvent) => {
                console.debug(
                    '[use-connect] Received status changed event:',
                    status
                )
                setConnectResult(status.connection)
            }

            sdk.onStatusChanged(onStatusChanged)

            return () => {
                console.debug('[use-connect] Removing connect changed listener')
                sdk.removeOnStatusChanged(onStatusChanged)
            }
        }
    }, [connectResult])

    return {
        connect,
        disconnect,
        connectResult,
    }
}
