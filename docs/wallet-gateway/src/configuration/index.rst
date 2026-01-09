.. _configuring-wallet-gateway:

Configuring a Remote Wallet Gateway
===================================

This section will cover the different ways the wallet gateway can be
configured to support a variety of cases and setup.

Default configuration example against a localnet
------------------------------------------------

Here is a minimalistic configuration example that can be used against a
splice localnet using in-memory stores and an unneeded mock auth setup.
The mock auth is only there to showcase how an idp configuration could look like.

.. literalinclude:: ../../examples/json/default-config.json
    :language: json
    :dedent:

you can easily create a similar config by running:

.. code-block:: bash

    npx @canton-network/wallet-gateway-remote@latest --config-example

or

.. code-block:: bash

    npx @canton-network/wallet-gateway-remote@latest --config-schema

to get the schema version.

The configuration has four basic sections:
- Kernel: contains basic information about the wallet gateway.
- Host: Sets up url binding and handles

.. TODO: Rename as part of renaming Kernel to Gateway

Configuring Basics
------------------
"**Kernel**" information is served to a dApp and used to uniquely identify and quantify the connection.

**Kernel:**
    - *id:* The unique identifier used by the kernel.
    - *clientType:* The type of client, for a remote wallet kernel this should always be set to 'remote'.

"**Server**" information is used for handling network binding. It is worth noting here that default is localhost will not work if you are running this
outside of your own machine (like a kubernetes cluster).

**Server:**
    - *host:* (default: 'localhost') The URL which the node server will bind against, this is also the value that will be used when generating popups for dApp.
    - *port:* (default: '3030') The port which the node server will bind against, this is also used for generating popups.
    - *tls:*  (default: false) If tls should be enabled, this will prefix the URL (for popups) with https:// instead of http://.
    - *dAppPath:* (default: '/api/v0/dapp') customizable redirect path for dapps.
    - *userPath:* (default: '/api/v0/user') customizable redirect path for user actions.
    - *allowedOrigins:* (default: ['*']) configure allowedOrigins as an array

**Store:**
    - *connection:* Configures the connection to a database, see :ref:`configuring-store` for details.
    - *idps:* Configures all idps used by the wallet gateway, see :ref:`configuring-idps` for details.
    - *networks:* Configures all networks used by the wallte gateway, see :ref:`configuring-networks` for details.



.. _configuring-store:

Configuring Store
-----------------

For connection there is currently three options available: **memory**, **sqlite** & **postgres**.

The recommendation for any persisted setup (like test environment or prod environment) is to use **postgres**.
For local development sqlite or memory be used, but be wary if using docker or kubernetes that memory will be deleted on pod recreation.
sqlite will persist, but only if volume with the database file is persisted as well.

**postgres:**
    - *type:* 'postgres'
    - *host:* The host url of the postgres.
    - *port:* The port to use in combination with the url.
    - *user:* The user to connect with.
    - *password:* The password to connect with.
    - *database:* The database within postgres to use.

**sqlite:**
    - *type:* 'sqlite'
    - *database:* the database-file to use.

**memory:**
    - *type:* 'memory'


Database recovery
^^^^^^^^^^^^^^^^^

For production and sensitive environment it is recommended to do backups to allow to restoring. If unable to restore
things that will be lost are:
- Any custom idp or network that an user have configured.
- Any inflight transactions (things pending signing or have been signed, but not submitted).
- Any active sessions (users would have to login again).


.. important::

   If the wallet gateway is used as signing provider then clients private keys will be lost! It is therefor highly recommended
   to not use wallet gateway as signing provider in any important system.

.. _configuring-idps:

Configuring idps
----------------
Identity Providers (idps) are used for generating JWT token that can be used against a given network, therefore a network must define
an associated IDP who providers or generates the token needed.

The Wallet gateway supports two kinds of IDP: **self_signed** and **oauth**.
For production environment it is **highly** recommended to use an **oauth** idp provider.

**self_signed:**
    - *id:* Unique identifier, that should be matched against in the networks configuration.
    - *type:* 'self_signed'
    - *issuer:* The issuer of the token will be bound to 'iss' of the JWT token, should match expected issuer from the server.

**oauth:**
    - *id:* Unique identifier, that should be matched against in the networks configuration.
    - *type:* 'oauth'
    - *issuer:* The issuer of the token will be bound to 'iss' of the JWT token, should match expected issuer from the server.
    - *configUrl:* The configuration endpoint of the OAUTH, usually looks like '${URL}/.well-known/openid-configuration'.


.. _configuring-networks:

Configuring Networks
--------------------
Networks represent different validators that a client for the wallet gateway can use the connect. Those defined here is the default
networks that will be populated and available for all users. It is worth nothing that users are able to add other networks themselves.

**networks:** (this is an array)
    - *id:* Unique identifier for the network.
    - *name:* User friendly name for the sign in flow.
    - *description:* User friendly description.
    - *synchronizerId:* Which synchronizerId will be used on the validator, for multiple synchronizers multiple network configs are needed.
    - *identityProviderId:* Id correlating to and idp defined in the idps section.
    - *ledgerApi:* An object containing information about the ledgerApi, currently only holds the baseURL pointing to the ledger api.
    - *auth:* An object containing auth information.
    - *adminAuth:* (optional) AN object containing auth information using an admin user.

for *auth* and *adminAuth* the wallet gateway will use *auth* for all ledger interactions, except the rare occasions that requires admin access.

for **auth** configuration we currently support three different types of schema definitions: **authorization_code**, **client_credentials** & **self_signed**.
It is recommended to use **client_credentials** for any production setup. **self-signed** can be used for testing and local development.

**authorization_code:**
    - *method:* 'authorization_code'
    - *audience:* The audience to be bound on the 'aud' of the JWT token, should match expected audience from server.
    - *scope:* The scope definition of the JWT token, should match features the clients have access to on the server.
    - *clientId:* Id of the client authorizing.

**client_credentials:**
    - *method:* 'client_credentials'.
    - *audience:* The audience to be bound on the 'aud' of the JWT token, should match expected audience from server.
    - *scope:* The scope definition of the JWT token, should match features the clients have access to on the server.
    - *clientId:* Id of the client authorizing.
    - *clientSecret:* Secret used by the client to authenticate against the IDP.

**self_signed:**
    - *method:* 'self_signed'.
    - *issuer:* The issuer of the token will be bound to 'iss' of the JWT token, should match expected issuer from the server.
    - *audience:* The audience to be bound on the 'aud' of the JWT token, should match expected audience from server.
    - *scope:* The scope definition of the JWT token, should match features the clients have access to on the server.
    - *clientId:* Id of the client authorizing.
    - *clientSecret:* Secret that will be used to sign the JWT token with.


Configuring Signing Store
-------------------------
Signing Store is a secondary database that can be configured (it is optional). This is used for storing the private key in the case
where the wallet gateway is used as the signing provider. It has the exact same configuration as the store (:ref:`configuring-store`).
