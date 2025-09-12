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

you dont need to configure all controllers every time, for instance the ``topologyController`` is only need if you are creating a
new external party.

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

**my-validator-app-api** & **my-scan-api** can both be identified with ``curl ${api}/version`` they both produce an output like

.. code-block:: JSON

    {"version":"0.4.15","commit_ts":"2025-09-05T11:38:13Z"}


I dont have a scan api on DevNet
--------------------------------

for localnet testing we use the scan api to retrieve the synchronizer id, the primary reason for this is because each time you stop
and start the containers this value changes. However on DevNet, TestNet & MainNet these are fixed and should be sourced from a trusted
provider.

the signature of ``sdk.connectTopology`` allows you to provide an URL or a string, this allow you to perform the connection using the
synchronizer id instead like ``await sdk.connectTopology("global-domain::220...")``.
