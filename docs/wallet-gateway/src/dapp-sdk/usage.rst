dApp SDK Usage
==============

This section will help you use the dApp SDK in your project.

To import the dApp SDK, use the following code:

.. code:: typescript

    import * as sdk from '@canton-network/dapp-sdk'


Request-Response Methods
------------------------

**Connecting to a Wallet**

The dApp SDK provides a `connect` method to connect to a Wallet.

.. code:: typescript

    await sdk.connect()

**Disconnecting from a Wallet**

The dApp SDK provides a `disconnect` method to disconnect from a Wallet.

.. code:: typescript

    await sdk.disconnect()

**Checking the Connection Status**

The dApp SDK provides a `status` method to check the connection status of the Wallet.
The status returns an object containing network connection- and session-related information.

.. code:: typescript

    sdk.status()
      .then((result) => {
          setStatus(`${result.isConnected ? 'connected' : 'disconnected'}`)
      })
      .catch(() => setStatus('disconnected'))


**Listing Accounts**

The dApp SDK provides a `listAccounts` method to list the accounts of the Wallet.

.. code:: typescript

    const accounts = await sdk.listAccounts()
    console.log(accounts)

**Executing a Transaction**

The dApp SDK provides a `prepareExecute` method to prepare, sign and execute a transaction.
The transaction is returned as an object containing the command ID, update ID and completion offset.

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


Events
------

**Listening for Connection Status Changes**

The dApp SDK provides a `onStatusChanged` method to listen for connection status changes.

.. code:: typescript

    sdk.onStatusChanged((status) => {
        console.log(status)
    })

**Listening for Accounts Changes**

The dApp SDK provides a `onAccountsChanged` method to listen for accounts changes.

.. code:: typescript

    sdk.onAccountsChanged((accounts) => {
        console.log(accounts)
    })

**Listening for Transactions Changes**

The dApp SDK provides a `onTxChanged` method to listen for transactions changes.

.. code:: typescript

    sdk.onTxChanged((tx) => {
        console.log(tx)
    })
