// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from 'react'
import * as dappSdk from '@canton-network/dapp-sdk'
import { SDK, localNetStaticConfig } from '@canton-network/wallet-sdk'

/**
 * Builds the wallet-sdk instance for reading ledger state and building
 * commands from inside the browser, riding on the dapp-sdk's connected
 * provider. Its reads go through the wallet gateway, which proxies them with
 * the connected session's own rights -- no keys or ledger tokens of its own
 * are needed here.
 *
 * A plain function, not inlined in the hook: `SDK.create` is generic, and its
 * extended namespaces (`asset`, `traffic`) are only inferred correctly at a
 * concrete call site like this one -- naming the type via
 * `ReturnType<typeof SDK.create>` directly would fall back to the
 * unextended default instead.
 */
async function buildWalletSdk(sessionToken: string) {
    const provider = dappSdk.getConnectedProvider()
    if (!provider) {
        throw new Error('Dapp provider is not available')
    }

    const auth = { method: 'static' as const, token: sessionToken }
    const registries = [localNetStaticConfig.LOCALNET_REGISTRY_API_URL]

    return SDK.create({
        ledgerProvider: provider as never,
        asset: { registries, auth },
        traffic: { registries, auth, paymasterAuth: 'none' },
    })
}

export type WalletSdk = Awaited<ReturnType<typeof buildWalletSdk>>

export function useWalletSdk(connected: boolean, sessionToken?: string) {
    const [sdk, setSdk] = useState<WalletSdk>()

    useEffect(() => {
        if (!connected || !sessionToken) return

        buildWalletSdk(sessionToken)
            .then(setSdk)
            .catch((error: unknown) => {
                console.error('Failed to build the wallet SDK', error)
                setSdk(undefined)
            })
        return () => setSdk(undefined)
    }, [connected, sessionToken])

    return sdk
}
