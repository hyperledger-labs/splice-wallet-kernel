curl http://localhost:7575/v2/interactive-submission/execute -d {
    "preparedTransaction": "$PREPARED_TRANSACTION",
    "hashingSchemeVersion": "HASHING_SCHEME_VERSION_V2",
    "userId": "USER_ID",
    "submissionId": "51dd5a0e-2ab6-4ca4-aa9d-9333fb603eb0",
    "deduplicationPeriod": {
        "Empty": {}
    },
    "partySignatures": {
        "signatures": [
            {
                "party": "PARTY_ID",
                "signatures": [
                {
                    "format": "SIGNATURE_FORMAT_RAW",
                    "signature": "$SIGNATURE",
                    "signingAlgorithmSpec": "SIGNING_ALGORITHM_SPEC_EC_DSA_SHA_256",
                    "signedBy": "FINGERPRINT"
                }
                ]
            }
        ]
    }
}