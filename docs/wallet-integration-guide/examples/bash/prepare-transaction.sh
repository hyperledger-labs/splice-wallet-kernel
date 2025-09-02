# In the example below, replace the values with your own

# PrepareTransaction call with all the inputs gathered.
 curl -X POST http://YOUR_NODE_JSON_API/v2/interactive-submission/prepare -d {
    "userId" : "USER_ID",
    "commandId" : "curl-transfer-test",
    "actAs" : ["SENDER_PARTY_ID"],
    "readAs" : [],
    "synchronizerId": "global-domain::1220be58c29e65de40bf273be1dc2b266d43a9a002ea5b18955aeef7aac881bb471a",
    "verboseHashing": false,
    "packageIdSelectionPreference" : [],
    "commands" : [ {
      "ExerciseCommand" : {
        "templateId" : "#splice-api-token-transfer-instruction-v1:Splice.Api.Token.TransferInstructionV1:TransferFactory",
        "contractId" : "009f00e5bf0…",
        "choice" : "TransferFactory_Transfer",
        "choiceArgument" : { 
          ... ,
          "extraArgs" : {
            "context": { ... },
            ...
          }
        }
      }
    } ],
    "disclosedContracts" : [ … ]
  }