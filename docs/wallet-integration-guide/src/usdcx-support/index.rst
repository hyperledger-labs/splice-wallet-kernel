USDCx Support for Wallets
=========================

Overview
--------

Circle and Digital Asset have partnered to develop and implement a USDC token on Canton Network.  
This implementation requires users to send USDC on L1 chains (starting with Ethereum) to the 
Circle’s xReserve contract which is then created as a USDC token on Canton Network.  Conversely 
a withdrawal request for a USDC token on the Canton Network will result in the release of the 
asset on another chain.  During the existence of the USDC token on Canton Network, it is 
available for use in financial transactions. 

USDC on Canton Network represents USDC locked by Circle on the original L1 chain.  And this token 
on Canton Network, is in the form of a Canton Network Standard Token 
(`CIP-56 <https://github.com/global-synchronizer-foundation/cips/blob/main/cip-0056/cip-0056.md>`_) as defined through 
the Canton Network Utilities service.

Wallet providers and exchanges have three options for supporting USDCx on the Canton Network:

1. Transfer & hold USDCx - Since USDCx is a token standard (`CIP-56 <https://github.com/global-synchronizer-foundation/cips/blob/main/cip-0056/cip-0056.md>`_) compliant asset then as such any wallet that supports the token standard will have built in support for transfers and holding.
2. Support xReserves deposits and withdrawals - Custom API integration is required for wallet providers and exchanges to support xReserve deposits and withdrawals to the utility-bridge daml models to / from their parties using the `xReserves UI <https://digital-asset.github.io/xreserve-deposits/>`_. Instructions for doing this are included in the section “Supporting xReserve Deposits and Withdrawals” below.
3. Integrating the xReserve UI (Ethereum) into the wallet - To enable a full end-to-end experience for the user, a wallet can integrate against Ethereum directly for deposits on top of integrating point 2. To provide an example for doing this, the `xReserves UI <https://digital-asset.github.io/xreserve-deposits/>`_ as well as `open-sourced example scripts <https://github.com/digital-asset/xreserve-deposits>`_ are available for reference. This demonstrates the 2 ethereum transactions that must be submitted to an ethereum node:
    * approve a USDC spending allowance.
    * depositToRemote to deposit USDC into the xReserve contract.


Supporting xReserve Deposits and Withdrawals
--------------------------------------------

The dar needed to support xReserve deposits and withdrawals can be found here.
Currently there are 3 choices (API calls) a wallet will need to implement in order to fully support the xReserve:

Onboarding 
^^^^^^^^^^

To use the xReserve a party will first need to onboard to the bridge using the below: 
Example API call: 

.. code-block:: JSON

    {
       "CreateCommand": {
           "templateId": "#utility-bridge-v0:Utility.Bridge.V0.Agreement.User:BridgeUserAgreementRequest",
           "createArguments": {
               "crossChainRepresentative": "crosschainrep::122066a19091f406b6564935c6a5415382b598ffef39e5425daf527b056fa5b6c7c4",
               "operator": "operator::1220b260ab20c872148a406c2fe03baad5df441e95d41c81be0f8728afebc38e2779",
               "bridgeOperator": "bridgeoperator::1220b260ab20c872148a406c2fe03baad5df441e95d41c81be0f8728afebc38e2779",
               "user": "bridgeoperator::1220b260ab20c872148a406c2fe03baad5df441e95d41c81be0f8728afebc38e2779",
               "instrumentId": {
                   "admin": "crosschainrep::122066a19091f406b6564935c6a5415382b598ffef39e5425daf527b056fa5b6c7c4",
                   "id": "USDCx"
               },
               "preApproval": false
           }
       }
   }


Mint
^^^^

Once a user deposits USDC into ethereum a DepositAttestation is created on the Canton network. In order for the recipient party to claim those funds they will need to call a choice to mint from the DepositAttestation: 

`#utility-bridge-v0:Utility.Bridge.V0.Attestation.Depositr:DepositAttestation`

Example API call: 

.. code-block:: JSON
    
    {
        "commands": [
            {
                "ExerciseCommand": {
                    "templateId": "#utility-bridge-v0:Utility.Bridge.V0.Agreement.User:BridgeUserAgreement",
                    "contractId": "0020ee38e610b5197c3ccf5ebf4f67c7c7a897085442d5a0a4b5b01bfa7dba9ff8ca1112201bca60bc60b3193406ee45268e154b16f5cee76a6e02a0cad471b5ddfeb3d455",
                    "choice": "BridgeUserAgreement_Mint",
                    "choiceArgument": {
                        "depositAttestationCid": "0017a2c9d879ea7dc9e4f...",
                        "factoryCid": "007fcfb0bfaf14ec3007bf...",
                        "contextContractIds": {
                            "instrumentConfigurationCid": "00a4d25939a1f239116e2...",
                            "appRewardConfigurationCid": "00988d3fd53eebed3ad1161...",
                            "featuredAppRightCid": "0062dac84736d5e55..."
                        }
                    }
                }
            }
        ],
        "disclosedContracts": [
            {
                "contractId": "007fcfb0bfaf...9",
                "templateId": "170929b11d5f0ed1385f890f42887c31ff7e289c0f4bc482aff193a7173d576c:Utility.Registry.App.V0.Service.AllocationFactory:AllocationFactory",
                "createdEventBlob": "CgMyLjESrQYKRQB/z7C/rxTsMAe/znJMm2+q417ZBgB5PD...",
                "domainId": "",
                "synchronizerId": ""
            },
            {
                "contractId": "00a4d25939a1f...7",
                "templateId": "ed73d5b9ab717333f3dbd122de7be3156f8bf2614a67360c3dd61fc0135133fa:Utility.Registry.V0.Configuration.Instrument:InstrumentConfiguration",
                "createdEventBlob": "CgMyLjESzAgKRQCk0lk5o...",
                "domainId": "",
                "synchronizerId": ""
            },
            {
                "contractId": "0062dac84736d5e550...5",
                "templateId": "3ca1343ab26b453d38c8adb70dca5f1ead8440c42b59b68f070786955cbf9ec1:Splice.Amulet:FeaturedAppRight",
                "createdEventBlob": "CgMyLjESwQQKRQBi2shHNtXlUK...",
                "domainId": "",
                "synchronizerId": ""
            },
            {
                "contractId": "00988d3fd53eebed...3",
                "templateId": "ed73d5b9ab717333f3dbd122de7be3156f8bf2614a67360c3dd61fc0135133fa:Utility.Registry.V0.Configuration.AppReward:AppRewardConfiguration",
                "createdEventBlob": "CgMyLjESvQY...",
                "domainId": "",
                "synchronizerId": ""
            }
        ]
    }


Withdraw
^^^^^^^^

To withdraw from the Canton Network to Ethereum a user must burn the USDC on Canton. Specifying the: 

* destination domain id: Currently only Ethereum is supported (domain id of 0).
* Amount: In Decimal to a max 6 decimal precision.
* Destination recipient: a valid Ethereum address.
* An optional reference. Empty Text field if not provided.


In addition the wallet will need to provide: 

* The available Holding contract Ids 
* A UUID as the requestId

Example API call: 

.. code-block:: JSON
    
    {
        "commands": [
            {
                "ExerciseCommand": {
                    "templateId": "#utility-bridge-v0:Utility.Bridge.V0.Agreement.User:BridgeUserAgreement",
                    "contractId": "0027e545218f83...",
                    "choice": "BridgeUserAgreement_Burn",
                    "choiceArgument": {
                    "amount": "10",
                    "destinationDomain": "0",
                    "destinationRecipient": "0x6a9aacbfc2ef352af4d5b92cc049adff2e439ee2",
                        "holdingCids": [
                        "00bb731b9a232...",
                        "008e915348836...",
                        "00903366a9524..."
                        ],
                    "requestId": "bdf1a6a7-8774-49ee-92de-09b9caa5fe54",
                    "reference": "",
                    "factoryCid": "0079768c7cb35a...c",
                        "contextContractIds": {
                            "instrumentConfigurationCid": "00a4d25939a1f239116e2...",
                            "appRewardConfigurationCid": "00988d3fd53eebed3ad1161...",
                            "featuredAppRightCid": "0062dac84736d5e55..."
                        }
                    }
                }
            }
        ],
        "disclosedContracts": [
            {
                "contractId": "007fcfb0bfaf...9",
                "templateId": "170929b11d5f0ed1385f890f42887c31ff7e289c0f4bc482aff193a7173d576c:Utility.Registry.App.V0.Service.AllocationFactory:AllocationFactory",
                "createdEventBlob": "CgMyLjESrQYKRQB/z7C/rxTsMAe/znJMm2+q417ZBgB5PD...",
                "domainId": "",
                "synchronizerId": ""
            },
            {
                "contractId": "00a4d25939a1f...7",
                "templateId": "ed73d5b9ab717333f3dbd122de7be3156f8bf2614a67360c3dd61fc0135133fa:Utility.Registry.V0.Configuration.Instrument:InstrumentConfiguration",
                "createdEventBlob": "CgMyLjESzAgKRQCk0lk5o...",
                "domainId": "",
                "synchronizerId": ""
            },
            {
                "contractId": "0062dac84736d5e550...5",
                "templateId": "3ca1343ab26b453d38c8adb70dca5f1ead8440c42b59b68f070786955cbf9ec1:Splice.Amulet:FeaturedAppRight",
                "createdEventBlob": "CgMyLjESwQQKRQBi2shHNtXlUK...",
                "domainId": "",
                "synchronizerId": ""
            },
            {
                "contractId": "00988d3fd53eebed...3",
                "templateId": "ed73d5b9ab717333f3dbd122de7be3156f8bf2614a67360c3dd61fc0135133fa:Utility.Registry.V0.Configuration.AppReward:AppRewardConfiguration",
                "createdEventBlob": "CgMyLjESvQY...",
                "domainId": "",
                "synchronizerId": ""
            }
        ]
    }

Refer to `this example values file <https://docs.digitalasset.com/usdc/xreserve/mainnet-technical-setup.html#example-values-file>`_ for the specific values of the disclosed contracts.