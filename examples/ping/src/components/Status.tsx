import * as sdk from '@canton-network/dapp-sdk'

export function Status(props: {
    ledgerApiVersion?: string
    status?: sdk.dappAPI.StatusEvent
}) {
    return (
        <div>
            <h2>Status</h2>
            <b>connected:</b> <i>{props.status?.connection.isConnected ? '🟢' : '🔴'}</i>
            <br />
            {props.status && (
                <div>
                    <b>gateway:</b> <i>{props.status.provider.id}</i>
                    {props.status.network && (
                        <span>
                            <br />
                            <b>network ID:</b>{' '}
                            <i>{props.status.network.networkId}</i>
                            {props.status.network.ledgerApi && (
                                <>
                                    <br />
                                    <b>ledger API:</b>{' '}
                                    <i>{props.status.network.ledgerApi}</i>
                                </>
                            )}
                        </span>
                    )}
                    {props.status.session && (
                        <span>
                            <br />
                            <b>user ID:</b> <i>{props.status.session.userId}</i>
                        </span>
                    )}
                    {props.ledgerApiVersion && (
                        <span>
                            <br />
                            <b>Ledger API version:</b>{' '}
                            <i>{props.ledgerApiVersion}</i>
                        </span>
                    )}
                </div>
            )}
        </div>
    )
}
