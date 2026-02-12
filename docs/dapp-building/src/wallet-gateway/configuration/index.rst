.. _configuring-wallet-gateway:

Configuring a Remote Wallet Gateway
===================================

This section covers the different ways the Wallet Gateway can be configured to support a variety of use cases and deployment scenarios.

Overview
--------

The Wallet Gateway configuration is a JSON file that defines:

- **Kernel Settings**: Identity and client type information
- **Server Settings**: Network binding, ports, API paths, and admin user
- **Store Configuration**: Database connection and persistence settings
- **Bootstrap Configuration**: Initial identity providers and network definitions seeded on first run
- **Signing Store**: Optional database for key storage (when using internal signing)

Default Configuration Example
------------------------------

Here is a minimalistic configuration example that can be used against a Splice localnet using SQLite storage and a mock OAuth setup. The mock OAuth configuration showcases how an IDP configuration would look.

.. literalinclude:: ../../../examples/json/default-config.json
    :language: json
    :dedent:

You can easily create a similar configuration file by running:

.. code-block:: bash

    wallet-gateway --config-example > config.json

Or to see the JSON Schema for validation:

.. code-block:: bash

    wallet-gateway --config-schema > schema.json

Configuration Structure
-----------------------

The configuration file has the following main sections:

- **kernel**: Basic information about the Wallet Gateway identity
- **server**: Network binding, ports, API endpoint configuration, and admin user designation
- **store**: Database connection and persistence settings
- **bootstrap**: Initial identity providers and network definitions seeded when the database is first created
- **signingStore**: (optional) Secondary database for key storage when using internal signing

Configuring Kernel Settings
----------------------------

The **kernel** section contains information that is served to dApps and used to uniquely identify the Gateway instance.

**kernel:**
    - *id* (required): A unique identifier for this Gateway instance. This should be a stable, unique string (e.g., ``"my-gateway-prod"`` or ``"remote-da"``).
    - *publicUrl* (optional): The base URL used for redirecting clients. If not provided, it will be automatically derived from the server host and port settings. This is particularly important when running behind a reverse proxy or load balancer.
    - *clientType* (required): The type of client. For a remote Wallet Gateway, this should always be set to ``'remote'``.

**Example:**

.. code-block:: json

    {
        "kernel": {
            "id": "my-production-gateway",
            "clientType": "remote",
            "publicUrl": "https://wallet.example.com"
        }
    }

Configuring Server Settings
----------------------------

The **server** section configures network binding, ports, and API paths.

.. important::

   If you're running the Gateway outside of your local machine (e.g., in Docker, Kubernetes, or on a remote server), you should set ``host`` to ``"0.0.0.0"`` to allow external connections. By default, using ``"localhost"`` will only allow connections from the same machine.

**server:**
    - *host* (deprecated): Previously used for binding address. Current behavior binds to all interfaces when not in localhost-only mode.
    - *port* (optional, default: ``3030``): The port on which the Node.js server will bind. This port is also used for generating popup URLs in the discovery flow.
    - *tls* (deprecated): TLS configuration is no longer handled in this section.
    - *dAppPath* (optional, default: ``'/api/v0/dapp'``): The API path for dApp JSON-RPC requests. This is where dApps connect to interact with wallets.
    - *userPath* (optional, default: ``'/api/v0/user'``): The API path for user JSON-RPC requests. This is used by the web UI and user-facing applications.
    - *allowedOrigins* (optional, default: ``['*']``): CORS allowed origins. For production, specify exact origins instead of ``'*'`` for better security. Example: ``["https://my-dapp.com", "https://another-dapp.com"]``.
    - *requestSizeLimit* (optional, default: ``'1mb'``): Maximum request body size the server will accept. Use standard size notation (e.g., ``'1mb'``, ``'10mb'``, ``'50kb'``).
    - *requestRateLimit* (optional, default: ``10000``): Maximum number of requests per minute from a single IP address (this excludes health endpoints).
    - *admin* (optional): The user ID (JWT ``sub`` claim) of the admin user. When set, the matching user is granted admin privileges, allowing them to manage networks and identity providers through the User API and web UI. Other users can only view these settings. If omitted, no user has admin privileges and network/IDP management is restricted to the bootstrap configuration.

**Example:**

.. code-block:: json

    {
        "server": {
            "port": 3030,
            "dAppPath": "/api/v0/dapp",
            "userPath": "/api/v0/user",
            "allowedOrigins": ["https://my-dapp.example.com"],
            "requestSizeLimit": "10mb",
            "requestRateLimit": 10000,
            "admin": "operator"
        }
    }

**store:**
    - *connection:* Configures the database connection. See :ref:`configuring-store` for details.

**bootstrap:**
    - *idps:* Configures the initial identity providers (IDPs) seeded when the database is first created. See :ref:`configuring-idps` for details.
    - *networks:* Configures the initial networks seeded when the database is first created. See :ref:`configuring-networks` for details.



.. _configuring-store:

Configuring Store
-----------------

The store connection determines where the Wallet Gateway persists its data, including sessions, wallet configurations, networks, identity providers, and transactions.

**Available Storage Options:**

Three storage backends are available: **memory**, **sqlite**, and **postgres**.

**Recommendations:**

- **Production/Test Environments**: Use **postgres** for reliability, scalability, and backup capabilities
- **Local Development**: Use **sqlite** for simplicity and persistence across restarts
- **Quick Testing**: Use **memory** for temporary setups (all data is lost on restart)

.. important::

   If using Docker or Kubernetes with the memory store, all data will be lost when the container/pod is recreated. SQLite will persist only if the database file is stored on a persistent volume.

**PostgreSQL Configuration:**

For production deployments, PostgreSQL is recommended due to its robustness, concurrent access support, and backup/restore capabilities.

**postgres:**
    - *type* (required): Must be ``'postgres'``
    - *host* (required): The hostname or IP address of the PostgreSQL server
    - *port* (optional, default: ``5432``): The port on which PostgreSQL is listening
    - *user* (required): The database user to connect with
    - *password* (required): The password for the database user
    - *database* (required): The name of the database to use (must exist)

**Example:**

.. code-block:: json

    {
        "store": {
            "connection": {
                "type": "postgres",
                "host": "db.example.com",
                "port": 5432,
                "user": "wallet_gateway",
                "password": "secure-password",
                "database": "wallet_gateway_db"
            }
        }
    }

**SQLite Configuration:**

SQLite is suitable for single-instance deployments and local development. It stores all data in a single file.

**sqlite:**
    - *type* (required): Must be ``'sqlite'``
    - *database* (required): Path to the SQLite database file (e.g., ``'store.sqlite'`` or ``'/var/lib/wallet-gateway/store.sqlite'``)

**Example:**

.. code-block:: json

    {
        "store": {
            "connection": {
                "type": "sqlite",
                "database": "store.sqlite"
            }
        }
    }

**Memory Store Configuration:**

The memory store keeps all data in RAM. Useful for testing but not suitable for any production use.

**memory:**
    - *type* (required): Must be ``'memory'``

**Example:**

.. code-block:: json

    {
        "store": {
            "connection": {
                "type": "memory"
            }
        }
    }


Database Recovery and Backups
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

For production and sensitive environments, regular database backups are **strongly recommended**.

**What's Stored in the Database:**

The store database contains:
- User sessions and authentication state
- Networks and identity providers (seeded from bootstrap configuration on first run, manageable by admin at runtime)
- Wallet configurations and party mappings
- In-flight transactions (pending signing or signed but not yet submitted)

**What Happens Without Backups:**

If the database is lost and cannot be restored:
- All user sessions will be invalidated (users must log in again)
- Networks and IDPs will be re-seeded from the bootstrap configuration, but any runtime modifications made by the admin will be lost
- In-flight transactions will be lost (may require manual intervention)
- Wallet configurations referencing lost networks may need to be reconfigured

**Backup Recommendations:**

- **PostgreSQL**: Use ``pg_dump`` or automated backup solutions (e.g., pgBackRest, WAL-E)
- **SQLite**: Copy the database file regularly, ensuring no writes occur during the copy
- Set up automated daily backups with retention policies
- Test restore procedures regularly


.. important::

   If the wallet gateway is used as signing provider then clients private keys will be lost! It is therefor highly recommended
   to not use wallet gateway as signing provider in any important system.

.. _configuring-idps:

Configuring Identity Providers
-------------------------------

Identity Providers (IDPs) are used for generating JWT tokens that authenticate against Canton validator networks. Each network must reference an IDP that provides or generates the required authentication tokens.

IDPs are defined in the ``bootstrap`` section of the configuration and are seeded into the database when it is first created. After initial setup, IDPs can be managed at runtime through the User API or web UI by the admin user (see ``server.admin``).

**Supported IDP Types:**

The Wallet Gateway supports two types of identity providers: **self_signed** and **oauth**.

.. important::

   For production environments, it is **highly recommended** to use an **oauth** IDP provider. Self-signed tokens should only be used for development and testing.

**Self-Signed IDP:**

Self-signed IDPs generate JWT tokens locally using a secret key. This is convenient for development but less secure for production.

**self_signed:**
    - *id* (required): Unique identifier that must match the ``identityProviderId`` referenced in network configurations
    - *type* (required): Must be ``'self_signed'``
    - *issuer* (required): The issuer value that will be set in the JWT token's ``iss`` claim. This must match the issuer expected by the validator node

**Example:**

.. code-block:: json

    {
        "bootstrap": {
            "idps": [
                {
                    "id": "idp-self-signed",
                    "type": "self_signed",
                    "issuer": "self-signed"
                }
            ]
        }
    }

**OAuth IDP:**

OAuth IDPs integrate with external OAuth 2.0 / OpenID Connect providers to obtain authentication tokens. This is the recommended approach for production.

**oauth:**
    - *id* (required): Unique identifier that must match the ``identityProviderId`` referenced in network configurations
    - *type* (required): Must be ``'oauth'``
    - *issuer* (required): The issuer value that will be set in the JWT token's ``iss`` claim. This should match the issuer from your OAuth provider's configuration
    - *configUrl* (required): The OpenID Connect discovery endpoint URL. Typically follows the pattern: ``${OAuthServerURL}/.well-known/openid-configuration``

**Example:**

.. code-block:: json

    {
        "bootstrap": {
            "idps": [
                {
                    "id": "idp-production",
                    "type": "oauth",
                    "issuer": "https://auth.example.com",
                    "configUrl": "https://auth.example.com/.well-known/openid-configuration"
                }
            ]
        }
    }


.. _configuring-networks:

Configuring Networks
--------------------

Networks represent different Canton validator nodes that clients can connect to through the Wallet Gateway. 
Networks defined in the ``bootstrap`` section are seeded into the database when it is first created and serve as the default networks available to all users. After initial setup, networks can be managed at runtime through the User API or web UI by the admin user (see ``server.admin``).

**Network Configuration:**

Networks is an array, so you can define multiple networks in a single configuration:

**networks** (array):
    - *id* (required): Unique identifier for the network. Should follow CAIP-2 format (e.g., ``"canton:localnet"`` or ``"canton:production"``)
    - *name* (required): User-friendly name displayed in the UI (e.g., ``"Local Network"`` or ``"Production Network"``)
    - *description* (optional): A description of the network shown to users
    - *synchronizerId* (required): The synchronizer ID used on the validator. If your validator has multiple synchronizers, create separate network configurations for each
    - *identityProviderId* (required): Must match the ``id`` of an IDP defined in the ``idps`` section
    - *ledgerApi* (required): Configuration object for the Ledger API:
        - *baseUrl* (required): The base URL of the Canton validator's Ledger API (e.g., ``"http://localhost:2975"`` or ``"https://ledger.example.com"``)
    - *auth* (required): Authentication configuration for normal ledger operations
    - *adminAuth* (optional): Authentication configuration for admin operations. Only needed for operations requiring elevated privileges

**Authentication Methods:**

The Wallet Gateway supports three authentication methods for network access: **authorization_code**, **client_credentials**, and **self_signed**.

**Recommendations:**
- **Production**: Use **client_credentials** for machine-to-machine authentication
- **Interactive/User-facing**: Use **authorization_code** for user-initiated flows
- **Development/Testing**: Use **self_signed** for local development

**Authorization Code:**

Used for interactive authentication flows where users grant authorization through their browser.

**authorization_code:**
    - *method* (required): Must be ``'authorization_code'``
    - *audience* (required): The audience claim (``aud``) in the JWT token. Must match the audience expected by the validator
    - *scope* (required): Space-separated list of OAuth scopes. Typically includes ``'openid daml_ledger_api offline_access'``
    - *clientId* (required): The OAuth client ID registered with the identity provider

**Example:**

.. code-block:: json

    {
        "auth": {
            "method": "authorization_code",
            "audience": "https://canton.network.global",
            "scope": "openid daml_ledger_api offline_access",
            "clientId": "my-client-id"
        }
    }

**Client Credentials:**

Used for machine-to-machine authentication. Recommended for production server deployments.

**client_credentials:**
    - *method* (required): Must be ``'client_credentials'``
    - *audience* (required): The audience claim (``aud``) in the JWT token. Must match the audience expected by the validator
    - *scope* (required): Space-separated list of OAuth scopes. Typically includes ``'openid daml_ledger_api offline_access'``
    - *clientId* (required): The OAuth client ID registered with the identity provider
    - *clientSecret* (required): The OAuth client secret for authenticating with the IDP

**Example:**

.. code-block:: json

    {
        "auth": {
            "method": "client_credentials",
            "audience": "https://canton.network.global",
            "scope": "openid daml_ledger_api offline_access",
            "clientId": "my-service-client",
            "clientSecret": "my-secure-secret"
        }
    }

**Self-Signed:**

Used for development and testing. The Gateway generates and signs JWT tokens locally.

**self_signed:**
    - *method* (required): Must be ``'self_signed'``
    - *issuer* (required): The issuer claim (``iss``) in the JWT token. Must match the issuer expected by the validator
    - *audience* (required): The audience claim (``aud``) in the JWT token. Must match the audience expected by the validator
    - *scope* (required): Space-separated list of scopes. Typically includes ``'openid daml_ledger_api offline_access'``
    - *clientId* (required): The client identifier used in the token
    - *clientSecret* (required): The secret used to sign the JWT token. Must match the secret expected by the validator

**Example:**

.. code-block:: json

    {
        "auth": {
            "method": "self_signed",
            "issuer": "self-signed",
            "audience": "https://canton.network.global",
            "scope": "openid daml_ledger_api offline_access",
            "clientId": "ledger-api-user",
            "clientSecret": "unsafe-secret-for-development"
        }
    }

**Complete Network Configuration Example:**

.. code-block:: json

    {
        "bootstrap": {
            "networks": [
                {
                    "id": "canton:localnet",
                    "name": "Local Network",
                    "description": "Local development network",
                    "synchronizerId": "local",
                    "identityProviderId": "idp-self-signed",
                    "auth": {
                        "method": "self_signed",
                        "issuer": "self-signed",
                        "audience": "https://canton.network.global",
                        "scope": "openid daml_ledger_api offline_access",
                        "clientId": "ledger-api-user",
                        "clientSecret": "unsafe"
                    },
                    "ledgerApi": {
                        "baseUrl": "http://localhost:2975"
                    }
                }
            ]
        }
    }


Configuring Signing Store
-------------------------

The signing store is an optional secondary database used for storing private keys when the Wallet Gateway is configured to act as a signing provider (using the ``wallet-kernel`` signing provider).

.. important::

   If you use the Wallet Gateway as a signing provider, private keys will be stored in the signing store database. This is **not recommended** for production environments with valuable assets. Use external signing providers (Fireblocks, Blockdaemon, or Participant-based) for production.

**Configuration:**

The signing store uses the same connection configuration options as the main store. See :ref:`configuring-store` for available options (memory, sqlite, postgres).

**When is Signing Store Required?**

The signing store is only needed if:
- You're using the ``wallet-kernel`` signing provider (internal signing)
- You want to store keys managed by the Wallet Gateway itself

If you're using external signing providers (Fireblocks, Blockdaemon, Participant), you can omit the ``signingStore`` configuration entirely.

**Example:**

.. code-block:: json

    {
        "signingStore": {
            "connection": {
                "type": "sqlite",
                "database": "signingStore.sqlite"
            }
        }
    }

**Security Considerations:**

- Store the signing store database file in a secure location with restricted access
- Use strong filesystem permissions (e.g., ``chmod 600`` for SQLite files)
- For PostgreSQL, use separate credentials with minimal privileges
- Consider encrypting the database at rest
- Regularly backup the signing store if it contains production keys
- Never commit signing store files to version control


Configuring for Different Environments
---------------------------------------

**Environment-Specific Configuration Files**

It is recommended to maintain separate configuration files for each environment (development, staging, production). This allows you to:

- Isolate settings per environment
- Apply different security levels and policies
- Prevent accidental use of production credentials in development
- Simplify environment-specific deployments

**Best Practices:**

1. **Use separate files**: Create ``config.dev.json``, ``config.staging.json``, ``config.prod.json``

2. **Sensitive data**: Never commit sensitive values (passwords, secrets, API keys) directly in configuration files, especially if stored in version control

3. **Environment variables**: Use environment variables to override sensitive configuration values:

   .. code-block:: json

       {
           "bootstrap": {
               "networks": [{
                   "auth": {
                       "clientSecret": "${OAUTH_CLIENT_SECRET}"
                   }
               }]
           }
       }

   Then set the environment variable when running:

   .. code-block:: bash

       export OAUTH_CLIENT_SECRET="my-secret"
       wallet-gateway -c ./config.json

4. **Access control**: Be aware that:
   - Network and IDP configurations (excluding secrets) are visible to users with ledger access
   - If configuration files are stored in shared repositories, anyone with read access can see non-secret configuration
   - Use environment variables or secret management systems (e.g., HashiCorp Vault, AWS Secrets Manager) for sensitive values

5. **Admin authentication**: The ``adminAuth`` configuration contains sensitive credentials and should be:
   - Stored securely (not in version control)
   - Rotated regularly
   - Restricted to production environments where truly needed

**Example Environment Setup:**

**Development (config.dev.json):**
- SQLite or memory store
- Self-signed authentication
- Localhost network endpoints
- Permissive CORS settings

**Production (config.prod.json):**
- PostgreSQL store
- OAuth authentication
- Production network endpoints
- Restricted CORS settings
- Secrets via environment variables
