USDCx Support for Wallets
=========================

Overview
--------

Circle and Digital Asset have partnered to develop and implement a USDC token on Canton Network.
This implementation requires users to send USDC on L1 chains (starting with Ethereum) to
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

The required dar file can be found `here <https://docs.digitalasset.com/usdc/xreserve/mainnet-technical-setup.html#dar-file>`_

There are 3 choices (API calls) a wallet will need to implement in order to fully support the xReserve:

Onboarding
^^^^^^^^^^

To use the xReserve a party will first need to onboard to the bridge using the below:
Example API call:

.. code-block:: JSON

    {
       "CreateCommand": {
           "templateId": "#utility-bridge-v0:Utility.Bridge.V0.Agreement.User:BridgeUserAgreementRequest",
           "createArguments": {
               "crossChainRepresentative": "${ADMIN_PARTY_ID}",
               "operator": "${UTILITY_OPERATOR_PARTY_ID}",
               "bridgeOperator": "${BRIDGE_OPERATOR_PARTY_ID}",
               "user": "${USER_PARTY_ID}",
               "instrumentId": {
                   "admin": "${ADMIN_PARTY_ID}",
                   "id": "USDCx"
               },
               "preApproval": false
           }
       }
   }


Mint
^^^^

Once a user deposits USDC into ethereum a DepositAttestation is created on the Canton network. In order for the recipient party to claim those funds they will need to call a choice to mint from the DepositAttestation:

`#utility-bridge-v0:Utility.Bridge.V0.Attestation.Deposit:DepositAttestation`

Example API call:

.. code-block:: JSON

    {
        "commands": [
            {
                "ExerciseCommand": {
                    "templateId": "#utility-bridge-v0:Utility.Bridge.V0.Agreement.User:BridgeUserAgreement",
                    "contractId": "${BRIDGE_USER_AGREEMENT_CONTRACT_ID}",
                    "choice": "BridgeUserAgreement_Mint",
                    "choiceArgument": {
                        "depositAttestationCid": "${DEPOSIT_ATTESTATION_CID}",
                        "factoryCid": "${FACTORY_CID}",
                        "contextContractIds": "${CONTEXT_CONTRACT_IDS}"
                    }
                }
            }
        ],
        "disclosedContracts": "${DISCLOSED_CONTRACTS}",
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
                    "contractId": "${BRIDGE_USER_AGREEMENT_CONTRACT_ID}",
                    "choice": "BridgeUserAgreement_Burn",
                    "choiceArgument": {
                    "amount": "${AMOUNT_IN_DECIMAL}",
                    "destinationDomain": "0",
                    "destinationRecipient": "${ETHEREUM_ADDRESS}",
                        "holdingCids": "${HOLDING_CONTRACT_IDS}",
                    "requestId": "${UUID_REQUEST_ID}",
                    "reference": "",
                    "factoryCid": "${FACTORY_CID}",
                        "contextContractIds": "${CONTEXT_CONTRACT_IDS}"
                    }
                }
            }
        ],
        "disclosedContracts": "${DISCLOSED_CONTRACTS}",
    }

Extracting Contract IDs and Disclosed Contracts
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The utilities backend provides a Burn Mint Factory API Endpoint

Endpoint:

    ${UTILITY_BACKEND_URL}/api/utilities/v0/registry/burn-mint-instruction/v0/burn-mint-factory

Example request body:

.. code-block:: json

    {
        "instrumentId": {
            "admin": "${ADMIN_PARTY_ID}",
            "id": "USDCx"
        },
        "inputHoldingCids": "${HOLDING_CONTRACT_IDS_IF_WITHDRAWING}",
        "outputs": [
            {
                "owner": "${ADMIN_PARTY_ID}",
                "amount": "${AMOUNT_IN_DECIMAL}" // For minting, this is the amount to mint. For burning, this is the change amount.
            }
        ]
    }

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

When you call the Burn Mint factory endpoint, the response contains the contract IDs and disclosed contracts you need for both minting and withdrawing.

Note that these values can be cached to reduce api calls as these values change infrequently.

As an example for extracting the required contexts and contracts from the response:

.. code-block:: typescript

    // Assume `response` is the parsed JSON from the API call
    const choiceContext = response.httpResponse.body.choiceContext;

    // Extract CONTEXT_CONTRACT_IDS
    const values = choiceContext.choiceContextData.values;
    const contextContractIds = {
        instrumentConfigurationCid: values["utility.digitalasset.com/instrument-configuration"].value,
        appRewardConfigurationCid: values["utility.digitalasset.com/app-reward-configuration"].value,
        featuredAppRightCid: values["utility.digitalasset.com/featured-app-right"].value,
    };

    // Extract FACTORY_CID
    const factoryCid = response.httpResponse.body.factoryId;

    // Extract DISCLOSED_CONTRACTS
    const disclosedContracts = choiceContext.disclosedContracts;


MainNet Environment Variables
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

+-------------------------------+---------------------------------------------------------------------------------------------------------------+
| Variable                      | Value                                                                                                         |
+===============================+===============================================================================================================+
| UTILITY_BACKEND_URL           | https://api.utilities.digitalasset.com                                                                        |
+-------------------------------+---------------------------------------------------------------------------------------------------------------+
| ADMIN_PARTY_ID                | decentralized-usdc-interchain-rep::12208115f1e168dd7e792320be9c4ca720c751a02a3053c7606e1c1cd3dad9bf60ef       |
+-------------------------------+---------------------------------------------------------------------------------------------------------------+
| UTILITY_OPERATOR_PARTY_ID     | auth0_007c6643538f2eadd3e573dd05b9::12205bcc106efa0eaa7f18dc491e5c6f5fb9b0cc68dc110ae66f4ed6467475d7c78e      |
+-------------------------------+---------------------------------------------------------------------------------------------------------------+
| BRIDGE_OPERATOR_PARTY_ID      | Bridge-Operator::1220c8448890a70e65f6906bd48d797ee6551f094e9e6a53e329fd5b2b549334f13f                         |
+-------------------------------+---------------------------------------------------------------------------------------------------------------+


TestNet Environment Variables
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

+-------------------------------+---------------------------------------------------------------------------------------------------------------+
| Variable                      | Value                                                                                                         |
+===============================+===============================================================================================================+
| UTILITY_BACKEND_URL           | https://api.utilities.digitalasset-staging.com                                                                |
+-------------------------------+---------------------------------------------------------------------------------------------------------------+
| ADMIN_PARTY_ID                | decentralized-usdc-interchain-rep::122049e2af8a725bd19759320fc83c638e7718973eac189d8f201309c512d1ffec61       |
+-------------------------------+---------------------------------------------------------------------------------------------------------------+
| UTILITY_OPERATOR_PARTY_ID     | DigitalAsset-UtilityOperator::12202679f2bbe57d8cba9ef3cee847ac8239df0877105ab1f01a77d47477fdce1204            |
+-------------------------------+---------------------------------------------------------------------------------------------------------------+
| BRIDGE_OPERATOR_PARTY_ID      | Bridge-Operator::12209d011ce250de439fefc35d16d1ab9d56fb99ccb24c18d798efb22352d533bcdb                         |
+-------------------------------+---------------------------------------------------------------------------------------------------------------+
