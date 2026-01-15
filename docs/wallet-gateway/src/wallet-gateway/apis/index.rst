.. _apis:

APIs
====

The Wallet Gateway exposes two JSON-RPC 2.0 APIs: one for dApps interactions and one for user interactions. Both APIs use the same base URL but different paths.

API Endpoints
-------------

- **dApp API**: ``/api/v0/dapp`` - Used by decentralized applications to interact with wallets and submit transactions
- **User API**: ``/api/v0/user`` - Used by users to manage wallets, networks, and signing providers

Both APIs follow the JSON-RPC 2.0 specification and use JWT-based authentication for secure access.

dApp API
--------

The dApp API enables decentralized applications to connect to wallets, query ledger state, prepare transactions, and submit commands. This API is designed for programmatic access from web or mobile applications.


**Authentication:**

The dApp API requires a valid JWT token in the ``Authorization`` header:

.. code-block:: http

    Authorization: Bearer <jwt-token>

**Full API Specification:**

The complete OpenRPC specification can be found in the codebase at ``api-specs/openrpc-dapp-api.json``.


User API
--------

The User API enables users to manage their wallets, configure networks, manage identity providers, create parties, and interact with their wallet through the web UI.

**Key Methods:**

- ``listNetworks()`` - List all configured networks
- ``addNetwork()`` - Add a new network configuration
- ``removeNetwork()`` - Remove a network configuration
- ``listIdps()`` - List all identity providers
- ``addIdp()`` - Add a new identity provider
- ``removeIdp()`` - Remove an identity provider
- ``addSession()`` - Create a new session (unauthenticated, used for initial connection)
- ``createParty()`` - Create a new party on a network
- ``listParties()`` - List all parties for the current user
- ``listWallets()`` - List all wallets

**Authentication:**

Most User API methods require authentication via JWT token. However, the following methods are available without authentication:

- ``addSession()``
- ``listNetworks()``
- ``listIdps()``

**Full API Specification:**

The complete OpenRPC specification can be found in the codebase at ``api-specs/openrpc-user-api.json``.

WebSocket Support
-----------------

The dApp API also supports WebSocket connections for real-time notifications. When using WebSocket, authenticate by providing the JWT token in the connection handshake:

.. code-block:: javascript

    const socket = io(apiUrl, {
        auth: {
            token: 'your-jwt-token'
        }
    })

WebSocket connections receive real-time updates about:
- Transaction status changes
- Contract updates
- Session state changes

Rate Limiting
-------------

API requests are rate-limited to prevent abuse. The default limits can be configured in the server configuration. Rate limit headers are included in responses:

- ``X-RateLimit-Limit`` - Maximum number of requests per window
- ``X-RateLimit-Remaining`` - Remaining requests in current window
- ``X-RateLimit-Reset`` - Time when the rate limit resets

CORS Configuration
------------------

Cross-Origin Resource Sharing (CORS) is configured via the ``allowedOrigins`` setting in the server configuration. By default, all origins are allowed (``['*']``), but for production deployments, you should restrict this to known dApp origins.

Example Configuration:

.. code-block:: json

    {
        "server": {
            "allowedOrigins": [
                "https://my-dapp.example.com",
                "https://another-dapp.example.com"
            ]
        }
    }

Alternatively, you can allow all origins by setting ``allowedOrigins`` to ``"*"``.

.. code-block:: json

    {
        "server": {
            "allowedOrigins": ["*"]
        }
    }
