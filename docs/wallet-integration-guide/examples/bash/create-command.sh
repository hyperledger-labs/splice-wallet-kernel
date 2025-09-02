# In the examples below, replace the following with your own values: "YOUR_NODE_JSON_API", "OFFSET_FROM_1", "WALLET_ID", "YOUR_CHOICE_OF_INPUT_CIDs",
# "SENDER_PARTY_ID", "RECEIVER_PARTY_ID"

# 1. Call your own node’s RPC to get the latest offset / ledger end
curl -X GET http://YOUR_NODE_JSON_API/v2/state/ledger-end

# 2. Get the contract ID of an active Amulet contract via
curl -X POST http://YOUR_NODE_JSON_API/v2/state/active-contracts -d 
'{  "verbose" : true, 
    "activeAtOffset": OFFSET_FROM_1, 
    "filter" : {
        "filtersByParty" : {
            "WALLET_ID" : {
                "cumulative":  
                    [{"identifierFilter": {
                        "InterfaceFilter": {
                            "value": {
                                "includeInterfaceView":true,
                                "includeCreatedEventBlob": false, 
                                "interfaceId": "#splice-api-token-holding-v1:Splice.Api.Token.HoldingV1:Holding"}}}}]}}}}'

# 3. Get context information for Canton Coin
    #3. a) the Registry admin party id:
curl -X GET https://scan.sv-1.global.canton.network.sync.global/registry/metadata/v1/info
# Example output:
# {"adminId":"DSO::1220b143…","supportedApis":{"splice-api-token-metadata-v1":1}}

    # 3. b) the instrument ID:
curl -X GET https://scan.sv-1.global.canton.network.sync.global/registry/metadata/v1/instruments
# Example output:
# "instrumentId" : {
#   "admin" : "DSO::1220b1431ef217342db44d516bb9befde802be7d8899637d290895fa58880f19accc",
#   "id" : "Amulet"}

    # 3. c) Get the TransferFactory and context from the asset admin:
curl -X POST -H "Content-Type: application/json" https://scan.sv-1.dev.global.canton.network.sync.global/registry/transfer-instruction/v1/transfer-factory -d '{
"choiceArguments" : {
  "expectedAdmin" : "DSO::1220be58c29e65de40bf273be1dc2b266d43a9a002ea5b18955aeef7aac881bb471a",
  "transfer" : {
    "sender" : "SENDER_PARTY_ID",
    "receiver" : "RECEIVER_PARTY_ID",
    "amount" : "1000.0",
    "instrumentId" : {
      "admin" : "DSO::1220be58c29e65de40bf273be1dc2b266d43a9a002ea5b18955aeef7aac881bb471a",
      "id" : "Amulet"
    },
    "requestedAt" : "2025-07-11T12:45:00Z",
    "executeBefore" : "2025-07-12T12:45:00Z",
    "inputHoldingCids" : [
      "YOUR_CHOICE_OF_INPUT_CIDs"
    ],
    "meta" : { "values" : {} }
  },
  "extraArgs" : {
    "context": { "values" : {} },
    "meta" : { "values" : {} }
  }
    }
  }'
# Example output:
# {
#   "factoryId": "009f00e5bf0…", – ContractId of the transferfactory to use
#   "transferKind": "direct", – type of transfer - see pre-approvals for more information
#   "choiceContext": { … }, – data to stick in the extra arguments
#   "disclosedContracts": [ … ] – any admin-private contracts on chain needed for preparation
# }



# 4. The information obtained can be used to construct the transfer and transaction in the prepare step:
#
# Transfer:
#   "transfer" : {
#     "sender" : "SENDER_PARTY_ID",
#     "receiver" : "RECEIVER_PARTY_ID",
#     "amount" : "1000.0",
#     "instrumentId" : {
#       "admin" : "DSO::1220b1431ef217342db44d516bb9befde802be7d8899637d290895fa58880f19accc",
#       "id" : "Amulet"
#     },
#     "requestedAt" : "2025-08-11T12:45:00Z",
#     "executeBefore" : "2025-08-12T12:45:00Z",
#     "inputHoldingCids" : [
#   "YOUR_CHOICE_OF_INPUT_CIDs"
#     ],
#     "meta" : { "values" : {} }
#   }