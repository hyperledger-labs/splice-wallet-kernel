import { useContext, useState } from 'react'
import { ErrorContext } from '../ErrorContext'
import { createPingCommand, exercisePongCommand } from '../commands/createPingCommand'
import { useTransactions } from '../hooks/useTransactions'
import { parsePreparedTransaction } from '@canton-network/core-tx-visualizer'

import * as sdk from '@canton-network/dapp-sdk'
import { prettyjson } from '../utils'

export function LedgerSubmission(props: {
    primaryParty?: string
    ledgerApiVersion?: string
    connectResult?: sdk.dappAPI.ConnectResult
}) {
    const { setErrorMsg } = useContext(ErrorContext)
    const [loading, setLoading] = useState(false)

    const transactions = useTransactions(props.connectResult)
    const connected = props.connectResult?.isConnected ?? false

    function createPingContract() {
        setErrorMsg('')
        setLoading(true)

        sdk.prepareExecute(
            createPingCommand(props.ledgerApiVersion, props.primaryParty!)
        )
            .then(() => {
                setLoading(false)
            })
            .catch((err) => {
                console.error('Error creating ping contract:', err)
                setLoading(false)
                setErrorMsg(
                    err instanceof Error ? err.message : JSON.stringify(err)
                )
            })
    }

    async function getByUpdateId(updateId: string) {
    const response = (await sdk.ledgerApi({
            requestMethod: 'POST',
            resource: `/v2/updates/transaction-by-id`,
            body: JSON.stringify({
                updateId,
                transactionFormat: {
                        eventFormat: {
                            filtersByParty: {
                                [props.primaryParty!]: {
                                    cumulative: [
                                        {
                                             identifierFilter: {
                                                TemplateFilter: {
                                                    value: {
                                                    templateId: '#canton-builtin-admin-workflow-ping:Canton.Internal.Ping:Ping',
                                                    includeInterfaceView: true,
                                                    includeCreatedEventBlob: true,
                                                    },
                                            }
                                        },
                                        }
                                    ],
                                },
                            },
                    verbose: false,
                        },
                        verbose: false,
                    transactionShape: 'TRANSACTION_SHAPE_ACS_DELTA',
                },
            }),
        }))

        return JSON.parse(response.response)
    }

    async function exercisePong(updateId: string) {
        setErrorMsg('')
        setLoading(true)

        const responseByUpdateId = await getByUpdateId(updateId)
        const contractId = responseByUpdateId.transaction.events[0].CreatedEvent.contractId
        sdk.prepareExecute(
            exercisePongCommand(props.ledgerApiVersion, contractId)
        )
            .then(() => {
                setLoading(false)
            })
            .catch((err) => {
                console.error('Error exercising pong contract:', err)
                setLoading(false)
                setErrorMsg(
                    err instanceof Error ? err.message : JSON.stringify(err)
                )
            })
    }

    return (
        connected && (
            <div className="card">
                <h2>Ledger Submission</h2>
                <button
                    disabled={!props.primaryParty || loading}
                    onClick={createPingContract}
                >
                    create Ping contract
                </button>

                {transactions.length > 0 && (
                    <div>
                        <p>Total transactions: {transactions.length}</p>
                        <div className="terminal-display">
                            <pre>
                                {transactions.map((msg) => {
                                    const preparedTransaction = ('preparedTransaction' in msg ?
                                                        msg.preparedTransaction : "") as string

                                    const parsed = parsePreparedTransaction(preparedTransaction)
                                    return (
                                        <>
                                            {msg.status === 'executed' && parsed.isCreate && parsed.entityName === 'Ping' && (
                                                <button onClick={() => exercisePong(msg.payload.updateId)}>
                                                    Exercise Pong
                                                </button>
                                            )}
                                            <p>{prettyjson(msg)}</p>
                                            <p>{prettyjson(parsed)}</p>
                                        </>
                                    )
                                })}
                            </pre>

                        </div>
                    </div>
                )}{' '}
            </div>
        )
    )
}
