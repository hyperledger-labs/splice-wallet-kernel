Proof of Transfer
=================

Overview
--------

Privacy-enabled assets on the Canton Network, such as DA registry assets,  require a specialized mechanism for users to verify 
transaction outcomes while preserving the privacy of the involved parties. Users need a way to independently and indisputably 
verify that an asset transfer was successful, obtaining a reliable, network-verified confirmation that is independent of any 
single platform's internal reporting.

To enable this transfer proofing capability, wallets must make the **Transfer Object** payload and **UpdateID** extractable, 
allowing end-users to easily locate and copy this data directly from their transaction history to use in proofing services or 
network explorers.

This guide provides the technical specifications for locating and extracting the Transfer Object from the ledger via the JSON API.

Exposing the Transfer Object and UpdateID
-----------------------------------------

Technical Guidelines: What Constitutes the Transfer Object?
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The **UpdateID** is the unique identifier for a transaction on the ledger. With it, you can fetch the Created, Exercised, and 
Archived events for that specific transaction.

The underlying schema defining the Transfer Object can be referenced in the DAML model here:
[`Splice/Api/Token/TransferInstructionV1.daml`](https://github.com/hyperledger-labs/splice/blob/0.5.14/token-standard/splice-api-token-transfer-instruction-v1/daml/Splice/Api/Token/TransferInstructionV1.daml#L13)

**Fetching the Data via JSON API**

While gRPC can be used, this guide assumes integration via the 
[DAML JSON API](https://docs.digitalasset.com/build/3.5/reference/json-api/openapi.html). 

To fetch update info from the participant node, query the following endpoint using the transaction's `UpdateID`:
`GET /v2/updates/update-by-id`

Locating the Transfer Object (By Transaction State)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Depending on the lifecycle stage of the transaction, the Transfer Object is located in different event arguments. You will 
need to parse the events returned from the endpoint above based on these three scenarios:

**Scenario A: The Transfer Offer is Created**

If the update represents the creation of a transfer offer, look for a **Created** event.

* **Template:** `Utility.Registry.App.V0.Model.Transfer:TransferOffer`
* **Location:** Extract the Transfer Object directly from the `createArgument` of this event.

.. **Example JSON Structure:**

.. tabs::
    .. group-tab:: JSON
        .. code:: JSON
            
            {
                "createdEvent": {
                    "templateId": "...:Utility.Registry.App.V0.Model.Transfer:TransferOffer",
                    "createArgument": {
                        "operator": "operator::122...",
                        "provider": "provider::122...",
                        "transfer": {
                            "sender": "issuer::122...",
                            "receiver": "holder::122...",
                            "amount": "2.0000000000",
                            "instrumentId": { "admin": "...", "id": "INST" },
                            "requestedAt": "2026-03-01T13:58:32.626Z",
                            "executeBefore": "2026-03-04T13:58:27.335Z",
                            "inputHoldingCids": ["005152f0eae9..."],
                            "meta": { "values": { "splice.lfdecentralizedtrust.org/reason": "" } }
                        }
                    }
                }
            }

**Scenario B: The Transfer is Concluded**

If the update represents a concluded transfer (e.g., an accepted offer or a pre-approved transfer), look for an **Exercised** event.

* **Template:** `Utility.Registry.V0.Rule.Transfer:TransferRule`
* **Triggering Choices:** The event must be triggered by one of the following choices:
    * `TransferRule_DirectTransfer`
    * `TransferRule_TwoStepTransfer`
    * `TransferRule_Transfer` (This choice will be deprecated. It is only required for backwards compatibility)
* **Location:** Extract the Transfer Object from the `choiceArgument` of this event.

.. tabs::
    .. group-tab:: JSON
        .. code:: JSON
            
            {
                "ExercisedEvent": {
                    "templateId": "...:Utility.Registry.V0.Rule.Transfer:TransferRule",
                    "choice": "TransferRule_DirectTransfer",
                    "choiceArgument": {
                        "transfer": {
                            "sender": "auth0_...::122...",
                            "receiver": "auth0_...::122...",
                            "amount": "12.0000000000",
                            "instrumentId": { "admin": "...", "id": "INST" },
                            "requestedAt": "2026-02-24T16:27:33.139Z",
                            "executeBefore": "2026-02-27T16:27:31.633Z",
                            "inputHoldingCids": ["0000c37c6..."],
                            "meta": { "values": { "splice.lfdecentralizedtrust.org/reason": "" } }
                        }
                    }
                }
            }

**Scenario C: The Transfer Offer is Rejected or Withdrawn**

If the update represents an offer that was ultimately rejected or withdrawn, locating the object is a two-step process:

1.  **Identify the Event:** Look for an **Exercised** event matching the following:
    * **Interface ID:** `Splice.Api.Token.TransferInstructionV1:TransferInstruction`
    * **Triggering Choices:** `TransferInstruction_Reject` OR `TransferInstruction_Withdraw`
2.  **Fetch the Contract ID:** Extract the Contract ID of the transfer offer from this exercised event.
3.  **Fetch the Original Offer:** Query the JSON API using the extracted Contract ID:
    `GET /v2/events/events-by-contract-id`
4.  **Location:** Extract the Transfer Object from the `createArgument` of the original transfer offer (transfer instruction) returned by this secondary query.

.. tabs::
    .. group-tab:: JSON
        .. code:: JSON
            
            {
                "CreatedEvent": {
                    "templateId": "...:Utility.Registry.App.V0.Model.Transfer:TransferOffer",
                    "createArgument": {
                    "operator": "operator::12209b02d...",
                    "provider": "provider::1220c07e7...",
                    "transfer": {
                        "sender": "issuer::1220c07e7...",
                        "receiver": "holder::1220c07e7...",
                        "amount": "2.0000000000",
                        "instrumentId": {
                        "admin": "registrar::1220c07e7...",
                        "id": "INST"
                        },
                        "requestedAt": "2026-03-01T13:58:32.626Z",
                        "executeBefore": "2026-03-04T13:58:27.335Z",
                        "inputHoldingCids": ["005152f0eae9..."],
                        "meta": { 
                        "values": { "splice.lfdecentralizedtrust.org/reason": "" } 
                        }
                    }
                    }
                }
            }

Data Persistence and Pruning
^^^^^^^^^^^^^^^^^^^^^^^^^^^^

**Ledger data is subject to pruning.** The JSON API queries described in previous section will only succeed if the 
transaction events have not yet been pruned from the participant node. 

**Wallet Developer Action Required:** To ensure end-users can always access their Transfer Objects for the proofing 
service, **wallets MUST persist the Transfer Object and UpdateID data in their own backend databases** at the time 
the transaction occurs. Relying strictly on real-time ledger queries for historical transactions will result in errors 
once the transactions are pruned. PQS can be considered as an option for storing ledger data.

Locating the Transfer Object (as an end-user) 
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

**Labelling**

There are two key items to be displayed within the transaction details:

1. Updated ID
2. Transfer object


**Displaying value**

A truncated preview of the Updated ID can be displayed or in full.  
A truncated preview of the json object can be displayed as needed or none at all. 

**Interactive options**

Users must be able to review the full json object.

Option 1

* Click to open a modal/side-panel component or an external browser window. Since the content is hidden to start, when a user clicks to open this component, the json object should by default be displayed fully. This component shows the label of "Transfer object", contains the full json object for reviewing, and accessible copy button.
* If an external window is used, its domain must match the application domain from which the window was triggered. 
* The icon or button for a user to click to review the json object must be accessible, along side the copy icon/button. Users can copy the object without opening the review component. 

Option 2

* Click to open the accordion containing the content. The accordion is closed by default, and a copy button is accessible without opening the accordion. 

**Copying behavior**

The copy behavior must always copy the full Updated ID and full json object, never the truncated preview string. 