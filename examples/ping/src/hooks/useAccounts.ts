import { useContext, useEffect, useState } from 'react'
import * as sdk from '@canton-network/dapp-sdk'
import { ErrorContext } from '../ErrorContext'

export function useAccounts(status?: sdk.dappAPI.StatusEvent) {
    const [accounts, setAccounts] = useState<sdk.dappAPI.Wallet[]>()

    const { setErrorMsg } = useContext(ErrorContext)

    useEffect(() => {
        if (status?.isConnected) {
            sdk.requestAccounts()
                .then((wallets) => {
                    setAccounts(wallets)
                })
                .catch((err) => {
                    console.error('Error requesting wallets:', err)
                    setErrorMsg(
                        err instanceof Error ? err.message : String(err)
                    )
                })
        }
    }, [status, setErrorMsg])

    useEffect(() => {
        if (status?.isConnected) {
            const listener = (event: sdk.dappAPI.AccountsChangedEvent) => {
                setAccounts(event)
            }

            sdk.onAccountsChanged(listener)

            return () => {
                sdk.removeOnAccountsChanged(listener)
            }
        }
    }, [status, setAccounts])

    return accounts
}
