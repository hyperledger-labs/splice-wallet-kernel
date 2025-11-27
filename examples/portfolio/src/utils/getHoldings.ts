import { HOLDING_INTERFACE_ID } from '@canton-network/core-token-standard'
import * as sdk from '@canton-network/dapp-sdk'
import { createLedgerClient } from './createLedgerClient.js'

export type Holding = {
    contractId: string
    name?: string
    value: number
    symbol: string
}

export const getHoldings = async (party: string): Promise<Holding[]> => {
    const ledgerEnd = await sdk.ledgerApi({
        requestMethod: 'GET',
        resource: '/v2/state/ledger-end',
    })
    const offset = JSON.parse(ledgerEnd.response).offset
    console.log('ledgerEnd', ledgerEnd)

    // TODO: dont create client here?
    const ledgerClient = await createLedgerClient({})

    const ledgerEnd2 = await ledgerClient.get('/v2/state/ledger-end')
    console.log('ledgerEnd2', ledgerEnd2.offset)

    const activeContracts = await sdk.ledgerApi({
        requestMethod: 'POST',
        resource: '/v2/state/active-contracts',
        body: JSON.stringify({
            activeAtOffset: offset,
            filter: {
                filtersByParty: {
                    [party]: {
                        cumulative: [
                            {
                                identifierFilter: {
                                    InterfaceFilter: {
                                        value: {
                                            interfaceId: HOLDING_INTERFACE_ID,
                                            includeInterfaceView: true,
                                            includeCreatedEventBlob: true,
                                        },
                                    },
                                },
                            },
                        ],
                    },
                },
            },
        }),
    })
    console.log('active-contracts')
    const holdings = []
    for (const activeContract of JSON.parse(activeContracts.response)) {
        console.log(activeContract)
        const createdEvent =
            activeContract.contractEntry?.JsActiveContract?.createdEvent
        const view = createdEvent?.interfaceViews[0]
        const contractId = createdEvent?.contractId
        holdings.push({
            contractId,
            value: Number(view.viewValue?.amount),
            symbol: view.viewValue?.instrumentId?.id,
        })
    }
    return holdings
}
