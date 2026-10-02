// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from 'react'
import * as dappSdk from '@canton-network/dapp-sdk'
import { localNetStaticConfig } from '@canton-network/wallet-sdk'
import type {
    ConversionRateWithDisclosures,
    TrafficPurchaserWithDisclosures,
} from '@canton-network/core-traffic-purchase'
import { useConnect } from './hooks/useConnect'
import { useWalletSdk } from './hooks/useWalletSdk'
import { createPaymasterClient } from './lib/paymasterClient'

const paymasterApiUrl = import.meta.env.VITE_PAYMASTER_API_URL
const registryUrl = localNetStaticConfig.LOCALNET_REGISTRY_API_URL

function App() {
    const { connect, disconnect, connected, primaryParty, sessionToken } =
        useConnect()
    const sdk = useWalletSdk(connected, sessionToken)

    const [error, setError] = useState<string>()
    const [purchaser, setPurchaser] = useState<TrafficPurchaserWithDisclosures>()
    const [rate, setRate] = useState<ConversionRateWithDisclosures>()
    const [balance, setBalance] = useState<number>()
    const [trafficAmount, setTrafficAmount] = useState('2097152')
    const [purchasing, setPurchasing] = useState(false)
    const [lastResult, setLastResult] = useState<string>()

    // Paymaster contract and conversion rate, shown regardless of connection
    // state -- they come from the paymaster's own API, not the ledger.
    useEffect(() => {
        if (!sdk || !paymasterApiUrl) return
        const client = createPaymasterClient(paymasterApiUrl)
        client
            .getTrafficPurchaser()
            .then(setPurchaser)
            .catch((err) => setError(String(err)))

        sdk.asset
            .find('Amulet', registryUrl)
            .then((amulet) =>
                client.getConversionRate({ admin: amulet.admin, id: amulet.id })
            )
            .then(setRate)
            .catch((err) => setError(String(err)))
    }, [sdk])

    const refreshBalance = () => {
        if (!sdk || !primaryParty) return
        sdk.traffic
            .getTraffic(primaryParty)
            .then((account) => setBalance(account.balance))
            .catch((err) => setError(String(err)))
    }

    useEffect(refreshBalance, [sdk, primaryParty])

    async function purchase() {
        if (!sdk || !primaryParty || !paymasterApiUrl) return
        setError(undefined)
        setLastResult(undefined)
        setPurchasing(true)
        try {
            const [command, disclosedContracts] =
                await sdk.traffic.purchaseTraffic({
                    purchaser: primaryParty,
                    paymasterApiUrl,
                    instrumentId: 'Amulet',
                    registryUrl,
                    targetUser: { accountId: primaryParty },
                    trafficAmount,
                })
            await dappSdk.prepareExecuteAndWait({
                commandId: crypto.randomUUID(),
                actAs: [primaryParty],
                commands: [command],
                disclosedContracts,
            })
            setLastResult(
                'Purchase submitted. Balance updates once the topup script credits it.'
            )
            // The credit is applied off-ledger and asynchronously (see the
            // `topup` script), so poll for a bit rather than refreshing once.
            for (let i = 0; i < 10; i++) {
                await new Promise((r) => setTimeout(r, 2000))
                refreshBalance()
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err))
        } finally {
            setPurchasing(false)
        }
    }

    return (
        <main>
            <h1>Traffic Paymaster</h1>

            <section>
                <h2>Wallet</h2>
                {connected ? (
                    <>
                        <dl>
                            <dt>Party</dt>
                            <dd>{primaryParty ?? '(no primary account)'}</dd>
                        </dl>
                        <button onClick={disconnect}>Disconnect</button>
                    </>
                ) : (
                    <button onClick={connect}>Connect wallet</button>
                )}
            </section>

            <section>
                <h2>Paymaster</h2>
                {!paymasterApiUrl && (
                    <p className="muted">
                        VITE_PAYMASTER_API_URL is not set. Run the{' '}
                        <code>initialize</code> script first.
                    </p>
                )}
                {purchaser && rate && (
                    <dl>
                        <dt>Paymaster</dt>
                        <dd>{purchaser.paymaster}</dd>
                        <dt>TrafficPurchaser</dt>
                        <dd>{purchaser.trafficPurchaserId}</dd>
                        <dt>Rate</dt>
                        <dd>{rate.conversionRate} bytes per Amulet</dd>
                    </dl>
                )}
            </section>

            <section>
                <h2>Traffic balance</h2>
                <dl>
                    <dt>Balance</dt>
                    <dd>{balance ?? '—'} bytes</dd>
                </dl>
                <button onClick={refreshBalance} disabled={!sdk || !primaryParty}>
                    Refresh
                </button>
            </section>

            <section>
                <h2>Buy traffic</h2>
                <label>
                    Traffic amount (bytes){' '}
                    <input
                        value={trafficAmount}
                        onChange={(e) => setTrafficAmount(e.target.value)}
                    />
                </label>
                <br />
                <br />
                <button
                    onClick={purchase}
                    disabled={
                        !sdk || !primaryParty || !paymasterApiUrl || purchasing
                    }
                >
                    {purchasing ? 'Purchasing…' : 'Purchase'}
                </button>
                {lastResult && <p>{lastResult}</p>}
            </section>

            {error && (
                <p className="error">
                    <b>Error:</b> {error}
                </p>
            )}
        </main>
    )
}

export default App
