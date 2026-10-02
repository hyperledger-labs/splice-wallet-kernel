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

/** The token registry (asset/transfer resolution) -- distinct from the traffic registry below. */
const tokenRegistryUrl = localNetStaticConfig.LOCALNET_REGISTRY_API_URL

function App() {
    const { connect, disconnect, connected, primaryParty, sessionToken } =
        useConnect()
    const sdk = useWalletSdk(connected, sessionToken)

    const [error, setError] = useState<string>()
    const [trafficRegistryUrl, setTrafficRegistryUrl] = useState(
        import.meta.env.VITE_PAYMASTER_API_URL ?? ''
    )
    const [purchaser, setPurchaser] = useState<TrafficPurchaserWithDisclosures>()
    const [fetchingPurchaser, setFetchingPurchaser] = useState(false)
    const [rate, setRate] = useState<ConversionRateWithDisclosures>()
    const [fetchingRate, setFetchingRate] = useState(false)
    const [balance, setBalance] = useState<number>()
    const [trafficAmount, setTrafficAmount] = useState('2097152')
    const [purchasing, setPurchasing] = useState(false)
    const [lastResult, setLastResult] = useState<string>()

    async function fetchPurchaser() {
        if (!trafficRegistryUrl) return
        setError(undefined)
        setFetchingPurchaser(true)
        try {
            setPurchaser(
                await createPaymasterClient(trafficRegistryUrl).getTrafficPurchaser()
            )
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err))
        } finally {
            setFetchingPurchaser(false)
        }
    }

    async function fetchRate() {
        if (!trafficRegistryUrl || !sdk) return
        setError(undefined)
        setFetchingRate(true)
        try {
            const amulet = await sdk.asset.find('Amulet', tokenRegistryUrl)
            setRate(
                await createPaymasterClient(trafficRegistryUrl).getConversionRate({
                    admin: amulet.admin,
                    id: amulet.id,
                })
            )
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err))
        } finally {
            setFetchingRate(false)
        }
    }

    const refreshBalance = () => {
        if (!sdk || !primaryParty) return
        sdk.traffic
            .getTraffic(primaryParty)
            .then((account) => setBalance(account.balance))
            .catch((err) => setError(String(err)))
    }

    useEffect(refreshBalance, [sdk, primaryParty])

    async function purchase() {
        if (!sdk || !primaryParty || !trafficRegistryUrl) return
        setError(undefined)
        setLastResult(undefined)
        setPurchasing(true)
        try {
            const [command, disclosedContracts] =
                await sdk.traffic.purchaseTraffic({
                    purchaser: primaryParty,
                    paymasterApiUrl: trafficRegistryUrl,
                    instrumentId: 'Amulet',
                    registryUrl: tokenRegistryUrl,
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
                'Purchase submitted. Balance updates once scan-topup credits it.'
            )
            // The credit is applied off-ledger and asynchronously (see
            // `scan-topup`), so poll for a bit rather than refreshing once.
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
                <h2>Traffic registry</h2>
                <label>
                    URL{' '}
                    <input
                        size={42}
                        value={trafficRegistryUrl}
                        onChange={(e) => setTrafficRegistryUrl(e.target.value)}
                        placeholder="http://127.0.0.1:.../registry/traffic-purchase/v1"
                    />
                </label>
                <p className="muted">
                    The paymaster's off-ledger API, served by <code>serve-paymaster</code>.
                    Pointing this at a different paymaster doesn't change anything else
                    running -- it only changes who this page asks.
                </p>
                <button
                    onClick={fetchPurchaser}
                    disabled={!trafficRegistryUrl || fetchingPurchaser}
                >
                    {fetchingPurchaser ? 'Fetching…' : 'Fetch TrafficPurchaser'}
                </button>{' '}
                <button
                    onClick={fetchRate}
                    disabled={!trafficRegistryUrl || !sdk || fetchingRate}
                >
                    {fetchingRate ? 'Fetching…' : 'Fetch ConversionRate'}
                </button>

                {purchaser && (
                    <>
                        <h3>TrafficPurchaser</h3>
                        <dl>
                            <dt>Paymaster</dt>
                            <dd>{purchaser.paymaster}</dd>
                            <dt>Contract id</dt>
                            <dd>{purchaser.trafficPurchaserId}</dd>
                            <dt>Receiver</dt>
                            <dd>{purchaser.paymasterReceiver}</dd>
                        </dl>
                        <p className="muted">Disclosed contracts</p>
                        <pre>{JSON.stringify(purchaser.disclosedContracts, null, 2)}</pre>
                    </>
                )}

                {rate && (
                    <>
                        <h3>ConversionRate</h3>
                        <dl>
                            <dt>Contract id</dt>
                            <dd>{rate.conversionRateId}</dd>
                            <dt>Instrument</dt>
                            <dd>
                                {rate.instrumentId.id} / {rate.instrumentId.admin}
                            </dd>
                            <dt>Rate</dt>
                            <dd>{rate.conversionRate} bytes per unit</dd>
                            {rate.expiresAt && (
                                <>
                                    <dt>Expires</dt>
                                    <dd>{rate.expiresAt}</dd>
                                </>
                            )}
                            {rate.maxTrafficPerPurchase && (
                                <>
                                    <dt>Max per purchase</dt>
                                    <dd>{rate.maxTrafficPerPurchase}</dd>
                                </>
                            )}
                        </dl>
                        <p className="muted">Disclosed contracts</p>
                        <pre>{JSON.stringify(rate.disclosedContracts, null, 2)}</pre>
                    </>
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
                        !sdk || !primaryParty || !trafficRegistryUrl || purchasing
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
