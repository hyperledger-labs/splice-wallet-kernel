.. _dapp-sdk-usage:

Usage
=====

There are two ways to interact with the dApp API:

1. **dApp SDK** - A high-level SDK that wraps the Provider API with convenient methods and event handlers. This is the recommended approach for most applications.

2. **Provider API** - The low-level interface that follows the `EIP-1193 <https://eips.ethereum.org/EIPS/eip-1193>`_ pattern. Use this when you need direct control over the API or are integrating with existing provider-based infrastructure.

The examples below show both approaches side by side.

Setup
-----

.. tabs::

    .. tab:: dApp SDK

        Import the dApp SDK:

        .. code:: typescript

            import * as sdk from '@canton-network/dapp-sdk'

    .. tab:: Provider API

        Import and create a provider instance:

        .. code:: typescript

            const provider = window.canton

Request-Response Methods
------------------------

Connecting to a Wallet
^^^^^^^^^^^^^^^^^^^^^^

Establish a connection to the Wallet. This initiates the authentication flow if the user is not already authenticated.

.. tabs::

    .. tab:: dApp SDK

        .. code:: typescript

            const result = await sdk.connect()
            console.log(result.isConnected) // true if connected

    .. tab:: Provider API

        .. code:: typescript

            const result = await provider.request<ConnectResult>({
                method: 'connect',
            })
            console.log(result.isConnected) // true if connected

Disconnecting from a Wallet
^^^^^^^^^^^^^^^^^^^^^^^^^^^

Close the session between the client and the Wallet.

.. tabs::

    .. tab:: dApp SDK

        .. code:: typescript

            await sdk.disconnect()

    .. tab:: Provider API

        .. code:: typescript

            await provider.request({ method: 'disconnect' })

Checking the Connection Status
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Check the connection status of the Wallet. The status returns an object containing network connection- and session-related information.

.. tabs::

    .. tab:: dApp SDK

        .. code:: typescript

            sdk.status()
                .then((result) => {
                    setStatus(`${result.connection.isConnected ? 'connected' : 'disconnected'}`)
                })
                .catch(() => setStatus('disconnected'))

    .. tab:: Provider API

        .. code:: typescript

            provider.request<StatusEvent>({ method: 'status' })
                .then((result) => {
                    setStatus(`${result.connection.isConnected ? 'connected' : 'disconnected'}`)
                })
                .catch(() => setStatus('disconnected'))

Checking if Connected (without login)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Check if the user is connected without triggering the login flow.

.. tabs::

    .. tab:: dApp SDK

        .. code:: typescript

            const result = await sdk.isConnected()
            console.log(result.isConnected)

    .. tab:: Provider API

        .. code:: typescript

            const result = await provider.request<ConnectResult>({
                method: 'isConnected',
            })
            console.log(result.isConnected)

Getting the Active Network
^^^^^^^^^^^^^^^^^^^^^^^^^^

Retrieve details about the network the user is connected to.

.. tabs::

    .. tab:: dApp SDK

        .. code:: typescript

            const network = await sdk.getActiveNetwork()
            console.log(network.networkId) // e.g., 'canton:da-mainnet'

    .. tab:: Provider API

        .. code:: typescript

            const network = await provider.request<Network>({
                method: 'getActiveNetwork',
            })
            console.log(network.networkId)

Listing Accounts
^^^^^^^^^^^^^^^^

List all accounts (parties) the user has access to in the Wallet.

.. tabs::

    .. tab:: dApp SDK

        .. code:: typescript

            const accounts = await sdk.listAccounts()
            console.log(accounts)

    .. tab:: Provider API

        .. code:: typescript

            const accounts = await provider.request<Account[]>({
                method: 'listAccounts',
            })
            console.log(accounts)

Getting the Primary Account
^^^^^^^^^^^^^^^^^^^^^^^^^^^

Get the account currently set as primary by the user.

.. tabs::

    .. tab:: dApp SDK

        .. code:: typescript

            const account = await sdk.getPrimaryAccount()
            console.log(account.partyId)

    .. tab:: Provider API

        .. code:: typescript

            const account = await provider.request<Account>({
                method: 'getPrimaryAccount',
            })
            console.log(account.partyId)

Signing a Message
^^^^^^^^^^^^^^^^^

Sign an arbitrary string message using the primary account's private key.

.. tabs::

    .. tab:: dApp SDK

        .. code:: typescript

            const signature = await sdk.signMessage('Hello, Canton!')
            console.log(signature)

    .. tab:: Provider API

        .. code:: typescript

            const signature = await provider.request<string>({
                method: 'signMessage',
                params: { message: 'Hello, Canton!' },
            })
            console.log(signature)

Executing a Transaction
^^^^^^^^^^^^^^^^^^^^^^^

Prepare, sign, and execute a Daml transaction. This method handles the full lifecycle: preparing the commands, requesting user approval/signature, and submitting to the ledger.

.. tabs::

    .. tab:: dApp SDK

        .. code:: typescript

            const createPingCommand = (party: string) => ({
                commands: [
                    {
                        CreateCommand: {
                            templateId: '#AdminWorkflows:Canton.Internal.Ping:Ping',
                            createArguments: {
                                id: `my-test-${new Date().getTime()}`,
                                initiator: party,
                                responder: party,
                            },
                        },
                    },
                ],
            })

            // Get the primary party the user selected in the Wallet
            const primaryParty = (await sdk.listAccounts()).find((w) => w.primary)?.partyId

            // Request user's signature and execute the transaction
            await sdk.prepareExecute(createPingCommand(primaryParty!))

    .. tab:: Provider API

        .. code:: typescript

            const createPingCommand = (party: string) => ({
                commands: [
                    {
                        CreateCommand: {
                            templateId: '#AdminWorkflows:Canton.Internal.Ping:Ping',
                            createArguments: {
                                id: `my-test-${new Date().getTime()}`,
                                initiator: party,
                                responder: party,
                            },
                        },
                    },
                ],
            })

            // Get the primary party the user selected in the Wallet
            const accounts = await provider.request<Account[]>({ method: 'listAccounts' })
            const primaryParty = accounts.find((w) => w.primary)?.partyId

            // Request user's signature and execute the transaction
            await provider.request({
                method: 'prepareExecute',
                params: createPingCommand(primaryParty!),
            })

Calling the Ledger API
^^^^^^^^^^^^^^^^^^^^^^

Proxy requests to the Canton JSON Ledger API. The request is authenticated using the user's session.

.. tabs::

    .. tab:: dApp SDK

        .. code:: typescript

            const response = await sdk.ledgerApi({
                requestMethod: 'GET',
                resource: '/v2/version',
            })
            console.log(JSON.parse(response.response))

    .. tab:: Provider API

        .. code:: typescript

            const response = await provider.request<LedgerApiResponse>({
                method: 'ledgerApi',
                params: {
                    requestMethod: 'GET',
                    resource: '/v2/version',
                },
            })
            console.log(JSON.parse(response.response))

Events
------

The dApp API emits events to notify your application of state changes. Subscribe to these events to keep your UI in sync with the Wallet state.

Listening for Connection Status Changes
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Receive notifications when the connection status or session state changes.

.. tabs::

    .. tab:: dApp SDK

        .. code:: typescript

            sdk.onStatusChanged((status) => {
                console.log('Status changed:', status)
                console.log('Connected:', status.connection.isConnected)
            })

    .. tab:: Provider API

        .. code:: typescript

            provider.on('statusChanged', (status: StatusEvent) => {
                console.log('Status changed:', status)
                console.log('Connected:', status.connection.isConnected)
            })

Listening for Account Changes
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Receive notifications when accounts are added, removed, or when the primary account changes.

.. tabs::

    .. tab:: dApp SDK

        .. code:: typescript

            sdk.onAccountsChanged((accounts) => {
                console.log('Accounts changed:', accounts)
                const primary = accounts.find((a) => a.primary)
                console.log('Primary account:', primary?.partyId)
            })

    .. tab:: Provider API

        .. code:: typescript

            provider.on('accountsChanged', (accounts: Account[]) => {
                console.log('Accounts changed:', accounts)
                const primary = accounts.find((a) => a.primary)
                console.log('Primary account:', primary?.partyId)
            })

Listening for Transaction Changes
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Receive notifications about the lifecycle of transactions initiated via ``prepareExecute``. The event payload includes the transaction status (``pending``, ``signed``, ``executed``, ``failed``) and relevant details.

.. tabs::

    .. tab:: dApp SDK

        .. code:: typescript

            sdk.onTxChanged((tx) => {
                console.log('Transaction status:', tx.status)
                if (tx.status === 'executed') {
                    console.log('Update ID:', tx.payload.updateId)
                }
            })

    .. tab:: Provider API

        .. code:: typescript

            provider.on('txChanged', (tx: TxChangedEvent) => {
                console.log('Transaction status:', tx.status)
                if (tx.status === 'executed') {
                    console.log('Update ID:', tx.payload.updateId)
                }
            })

Removing Event Listeners
^^^^^^^^^^^^^^^^^^^^^^^^

When your component unmounts or you no longer need to listen for events, remove the listeners to prevent memory leaks.

.. tabs::

    .. tab:: dApp SDK

        .. code:: typescript

            const handleStatus = (status) => console.log(status)

            // Subscribe
            sdk.onStatusChanged(handleStatus)

            // Unsubscribe (when cleaning up)
            sdk.offStatusChanged(handleStatus)

    .. tab:: Provider API

        .. code:: typescript

            const handleStatus = (status: StatusEvent) => console.log(status)

            // Subscribe
            provider.on('statusChanged', handleStatus)

            // Unsubscribe (when cleaning up)
            provider.removeListener('statusChanged', handleStatus)
