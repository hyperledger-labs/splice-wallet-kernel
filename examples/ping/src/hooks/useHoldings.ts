// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useContext, useEffect, useState } from 'react'
import * as sdk from '@canton-network/dapp-sdk'
import { ErrorContext } from '../ErrorContext'
import * as walletSDK from '@canton-network/wallet-sdk'

export function useHoldings(connectResult?: sdk.dappAPI.ConnectResult) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [holdings, setHoldings] = useState<any[]>()

    const { setErrorMsg } = useContext(ErrorContext)

    useEffect(() => {
        if (connectResult?.isConnected) {
            const provider =
                window.canton as unknown as walletSDK.LedgerProvider

            console.log(provider)

            const listHoldings = async () => {
                const wallet = await walletSDK.SDK.create(provider)

                const status = await sdk.dappSDK.status()

                const accounts = await sdk.dappSDK.listAccounts()
                const primaryAcc = accounts.find((p) => p.primary === true)!

                const TOKEN_PROVIDER_CONFIG_DEFAULT: walletSDK.TokenProviderConfig =
                    {
                        method: 'static',
                        token: status.session?.accessToken ?? '',
                    }

                const tokenConfig: walletSDK.TokenConfig = {
                    validatorUrl: 'http://localhost:2000/api/validator',
                    auth: TOKEN_PROVIDER_CONFIG_DEFAULT,
                    registries: [
                        new URL(
                            'http://localhost:2000/api/validator/v0/scan-proxy'
                        ),
                    ],
                }

                const token = await wallet.token(tokenConfig)
                const utxos = await token.utxos.list({
                    partyId: primaryAcc.partyId,
                })

                return utxos
            }

            listHoldings().then((h) => setHoldings(h))
        }
    }, [connectResult, setErrorMsg])

    return holdings
}
