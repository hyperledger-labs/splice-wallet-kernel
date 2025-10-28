Wallet SDK Configuration
========================

If you have already played around with the wallet SDK you might have come across snippets like:

.. literalinclude:: ../../examples/snippets/default-config.ts
            :language: typescript
            :dedent:

This is the default config that can be used in combination with a
non-altered `Localnet <https://docs.global.canton.network.sync.global/app_dev/testing/localnet.html>`__  running instance.


However as soon as you need to migrate your script, code and deployment to a different environment these default configurations are
no longer viable to use. In those cases creating custom factories for each controller is needed. Here is a template that you can use
when setting up your own custom connectivity configuration:

.. literalinclude:: ../../examples/snippets/config-template.ts
            :language: typescript
            :dedent:


How do validate my configurations?
----------------------------------

Knowing if you are using the correct url and port can be daunting, here is a few curl gcurl commands you can use to validate against
an expected output


**my-json-ledger-api** can be identified with ``curl http://${my-json-ledger-api}/v2/version`` it should produce a json that looks like

.. code-block:: JSON

    {
       "version":"3.3.0-SNAPSHOT",
       "features":{
          "experimental":{
             "staticTime":{
                "supported":false
             },
             "commandInspectionService":{
                "supported":true
             }
          },
          "userManagement":{
             "supported":true,
             "maxRightsPerUser":1000,
             "maxUsersPageSize":1000
          },
          "partyManagement":{
             "maxPartiesPageSize":10000
          },
          "offsetCheckpoint":{
             "maxOffsetCheckpointEmissionDelay":{
                "seconds":75,
                "nanos":0,
                "unknownFields":{
                   "fields":{

                   }
                }
             }
          }
       }
    }


the fields may vary based on your configuration.

.. important ::

   the topology controller is deprecated so the below section for **my-grpc-admin-api** is not needed anymore.

**my-grpc-admin-api** can be identified with ``grpcurl -plaintext ${my-grpc-admin-api} list`` it should produce an output like


.. code-block:: text

    com.digitalasset.canton.admin.health.v30.StatusService
    com.digitalasset.canton.admin.participant.v30.EnterpriseParticipantReplicationService
    com.digitalasset.canton.admin.participant.v30.PackageService
    com.digitalasset.canton.admin.participant.v30.ParticipantInspectionService
    com.digitalasset.canton.admin.participant.v30.ParticipantRepairService
    com.digitalasset.canton.admin.participant.v30.ParticipantStatusService
    com.digitalasset.canton.admin.participant.v30.PartyManagementService
    com.digitalasset.canton.admin.participant.v30.PingService
    com.digitalasset.canton.admin.participant.v30.PruningService
    com.digitalasset.canton.admin.participant.v30.ResourceManagementService
    com.digitalasset.canton.admin.participant.v30.SynchronizerConnectivityService
    com.digitalasset.canton.admin.participant.v30.TrafficControlService
    com.digitalasset.canton.connection.v30.ApiInfoService
    com.digitalasset.canton.crypto.admin.v30.VaultService
    com.digitalasset.canton.time.admin.v30.SynchronizerTimeService
    com.digitalasset.canton.topology.admin.v30.IdentityInitializationService
    com.digitalasset.canton.topology.admin.v30.TopologyAggregationService
    com.digitalasset.canton.topology.admin.v30.TopologyManagerReadService
    com.digitalasset.canton.topology.admin.v30.TopologyManagerWriteService
    grpc.reflection.v1alpha.ServerReflection

the list might differed based on you canton configuration, the most important part is `TopologyManagerReadService` & `TopologyManagerWriteService`

**my-validator-app-api** can be identified with ``curl ${api}/version`` it should produce an output like

.. code-block:: JSON

    {"version":"0.4.15","commit_ts":"2025-09-05T11:38:13Z"}

**my-scan-proxy-api** is a api inside the validator api and can be defined as ``${my-validator-app-api}/v0/scan-proxy``.

**my-registry-api** is the registry for the token you want to use, for Canton Coin you can use **my-scan-proxy-api**, however for any other
token standard token it is required to source the api from a reputable source.

Configuring Auth Controller
---------------------------

By default the `localNetAuthDefault` uses these defined values:

.. code-block:: text

     userId = 'ledger-api-user'
     adminId = 'ledger-api-user'
     audience = 'https://canton.network.global'
     unsafeSecret = 'unsafe'

this produces a self-signed HMAC auth token using "unsafe" for signing.

.. important::

   The value for some of the audiences in localnet would have to be adjusted to match "https://canton.network.global".
   This is specifically the `LEDGER_API_AUTH_AUDIENCE` & `VALIDATOR_AUTH_AUDIENCE`.

When upgrading your setup from a localnet setup to a production or client facing environment then it might make more sense
to add proper authentication to the ledger api and other services. The community contributions include okta and keycloak
`OIDC <https://docs.dev.sync.global/community/oidc-config-okta-keycloak.html>`__. These can easily be configured for the
SDK using a custom `clientCredentialOAuthController`

.. literalinclude:: ../../examples/snippets/oauth-controller.ts
            :language: typescript
            :dedent:

However since it follows a simple interface, you can build your own implementation of it if you have unique requirements:

.. code-block:: javascript

    export interface AuthController {
        /** gets an auth context correlating to the non-admin user provided.
         */
        getUserToken(): Promise<AuthContext>

        /** gets an auth context correlating to the admin user provided.
         */
        getAdminToken(): Promise<AuthContext>
        userId: string | undefined
    }
