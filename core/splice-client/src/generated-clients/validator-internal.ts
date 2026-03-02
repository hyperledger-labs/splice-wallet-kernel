// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export interface paths {
    '/readyz': {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        get: operations['isReady']
        put?: never
        post?: never
        delete?: never
        options?: never
        head?: never
        patch?: never
        trace?: never
    }
    '/livez': {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        get: operations['isLive']
        put?: never
        post?: never
        delete?: never
        options?: never
        head?: never
        patch?: never
        trace?: never
    }
    '/v0/validator-user': {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        /** @description Get public information about the validator operator. */
        get: operations['getValidatorUserInfo']
        put?: never
        post?: never
        delete?: never
        options?: never
        head?: never
        patch?: never
        trace?: never
    }
    '/v0/register': {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        get?: never
        put?: never
        /**
         * @description As an authenticated user, onboard yourself.
         *     Onboarding includes allocating a ledger API user and daml party,
         *     and setting up daml contracts required for the user to use a wallet on this validator.
         *
         *     The ledger API user name is taken from the subject claim of the JWT token.
         *
         *     Once this call returns a successful response, the user is fully onboarded.
         *     Use [v0/wallet/user-status](../../../../wallet/src/main/openapi/wallet-internal.yaml#/paths/v0/wallet/user-status)
         *     to check the status of the user onboarding.
         */
        post: operations['register']
        delete?: never
        options?: never
        head?: never
        patch?: never
        trace?: never
    }
    '/v0/admin/users': {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        /** @description Lists all users onboarded onto this validator. */
        get: operations['listUsers']
        put?: never
        /**
         * @description As the validator operator, onboard an arbitrary user specified in the request.
         *     Onboarding includes allocating a ledger API user and daml party,
         *     and setting up daml contracts required for the user to use a wallet on this validator.
         *
         *     Once this call returns a successful response, the user is fully onboarded.
         *     Use [v0/wallet/user-status](../../../../wallet/src/main/openapi/wallet-internal.yaml#/paths/v0/wallet/user-status)
         *     to check the status of the user onboarding.
         */
        post: operations['onboardUser']
        delete?: never
        options?: never
        head?: never
        patch?: never
        trace?: never
    }
    '/v0/admin/users/offboard': {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        get?: never
        put?: never
        /**
         * @description As the validator operator, offboard the user specified in the request.
         *     Offboarding archives the daml contracts required for the user to use a wallet on this validator.
         *     Offboarding deletes the ledger API user.
         *     Offboarding does not archive any other daml contracts owned by the user.
         */
        post: operations['offboardUser']
        delete?: never
        options?: never
        head?: never
        patch?: never
        trace?: never
    }
    '/v0/admin/participant/identities': {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        /**
         * @description Returns a dump of participant identities.
         *
         *     Use this endpoint if instructed to do so by an operational manual or support.
         */
        get: operations['dumpParticipantIdentities']
        put?: never
        post?: never
        delete?: never
        options?: never
        head?: never
        patch?: never
        trace?: never
    }
    '/v0/admin/participant/global-domain-connection-config': {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        /**
         * @description Returns the connection configuration for the global synchronizer.
         *
         *     Use this endpoint if instructed to do so by an operational manual or support.
         */
        get: operations['getDecentralizedSynchronizerConnectionConfig']
        put?: never
        post?: never
        delete?: never
        options?: never
        head?: never
        patch?: never
        trace?: never
    }
    '/v0/admin/domain/data-snapshot': {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        /**
         * @description Returns a snapshot of the global synchronizer data for this validator.
         *     The snapshot includes a list of parties, the active contract set (ACS), and node identities.
         *
         *     Use this endpoint if instructed to do so by an operational manual or support.
         */
        get: operations['getValidatorDomainDataSnapshot']
        put?: never
        post?: never
        delete?: never
        options?: never
        head?: never
        patch?: never
        trace?: never
    }
    '/v0/admin/transfer-preapprovals/by-party/{receiver-party}': {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        /** @description Lookup the `Splice.AmuletRules.TransferPreapproval` contract for the given receiver party. */
        get: operations['lookupTransferPreapprovalByParty']
        put?: never
        post?: never
        /** @description Remove the `Splice.AmuletRules.TransferPreapproval` contract for the given receiver party. */
        delete: operations['cancelTransferPreapprovalByParty']
        options?: never
        head?: never
        patch?: never
        trace?: never
    }
    '/v0/admin/transfer-preapprovals': {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        /** @description List all `Splice.AmuletRules.TransferPreapproval` contracts where the preapproval provider is the validator operator. */
        get: operations['listTransferPreapprovals']
        put?: never
        post?: never
        delete?: never
        options?: never
        head?: never
        patch?: never
        trace?: never
    }
    '/v0/admin/external-party/transfer-preapproval/prepare-send': {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        get?: never
        put?: never
        /**
         * @description Prepare a transaction to create a TransferCommand with the given CC amount to the specified receiver
         *     from the externally hosted sender.
         *     The transaction then needs to be signed and submitted through
         *     /v0/admin/external-party/transfer-preapproval/submit-send.
         */
        post: operations['prepareTransferPreapprovalSend']
        delete?: never
        options?: never
        head?: never
        patch?: never
        trace?: never
    }
    '/v0/admin/external-party/transfer-preapproval/submit-send': {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        get?: never
        put?: never
        /**
         * @description Submit transaction generated by /v0/admin/transfer-preapproval/prepare-send
         *     together with its signature. Note that this only waits until the TransferCommand is created.
         *     The actual transfer will happen afterwards through automation run by the SVs.
         */
        post: operations['submitTransferPreapprovalSend']
        delete?: never
        options?: never
        head?: never
        patch?: never
        trace?: never
    }
    '/v0/admin/external-party/topology/generate': {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        get?: never
        put?: never
        /**
         * @description Creates a root namespace topology transaction, which will create the party and sets the public key
         *     controlling the party namespace,
         *     a party to participant mapping topology transaction, which hosts the party on the participant with Confirmation rights,
         *     and a party to key mapping topology transaction, which sets the key to authorize daml transactions.
         *     The hash of each of these transactions will be signed along with the corresponding topology transaction (unchanged)
         *     in the /v0/admin/external-party/topology/submit endpoint
         */
        post: operations['generateExternalPartyTopology']
        delete?: never
        options?: never
        head?: never
        patch?: never
        trace?: never
    }
    '/v0/admin/external-party/topology/submit': {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        get?: never
        put?: never
        /**
         * @description Constructs a SignedTopologyTransaction and writes the topology transactions to the authorized store.
         *     The input will consist of the unchanged topology transaction and the signed hash from the /v0/external-party-topology/generate endpoint
         */
        post: operations['submitExternalPartyTopology']
        delete?: never
        options?: never
        head?: never
        patch?: never
        trace?: never
    }
    '/v0/admin/external-party/setup-proposal': {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        /** @description List all ExternalPartySetupProposal contracts. */
        get: operations['listExternalPartySetupProposals']
        put?: never
        /**
         * @description Create the ExternalPartySetupProposal contract as the validator operator
         *     which then has to be accepted by the external party using /v0/admin/external-party/setup-proposal/prepare-accept
         *     and /v0/admin/external-party/setup-proposal/submit-accept
         */
        post: operations['createExternalPartySetupProposal']
        delete?: never
        options?: never
        head?: never
        patch?: never
        trace?: never
    }
    '/v0/admin/external-party/setup-proposal/prepare-accept': {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        get?: never
        put?: never
        /**
         * @description Given a contract id of an ExternalPartySetupProposal, prepare the transaction
         *     to accept it such that it can be signed externally and then submitted using
         *     /v0/admin/external-party/setup-proposal/submit-accept
         */
        post: operations['prepareAcceptExternalPartySetupProposal']
        delete?: never
        options?: never
        head?: never
        patch?: never
        trace?: never
    }
    '/v0/admin/external-party/setup-proposal/submit-accept': {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        get?: never
        put?: never
        /**
         * @description Submit a transaction prepared using /v0/admin/external-party/setup-proposal/prepare-accept
         *     together with its signature.
         */
        post: operations['submitAcceptExternalPartySetupProposal']
        delete?: never
        options?: never
        head?: never
        patch?: never
        trace?: never
    }
    '/v0/admin/external-party/balance': {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        /** @description Get the balance of an external party. */
        get: operations['getExternalPartyBalance']
        put?: never
        post?: never
        delete?: never
        options?: never
        head?: never
        patch?: never
        trace?: never
    }
}
export type webhooks = Record<string, never>
export interface components {
    schemas: {
        OnboardUserRequest: {
            /** @description The name of the user to onboard. */
            name: string
            /**
             * @description The party id of the user to onboard.
             *     If no party_id is provided then a fresh party will be generated, using the 'name' as the Party Hint.
             *     If party_id is provided and createPartyIfMissing is false, then the party must already exist on the ledger. The existing party will be assigned to the user.
             *     If party_id is provided and createPartyIfMissing is true, then: if a party with the provided party_id exists, the user will be associated with it. Otherwise, a new party will be created using the provided party_id, and the user will be associated with that new party.
             */
            party_id?: string
            /**
             * @description If true, create the party if it does not already exist on the ledger.
             *     Default is 'false'.
             */
            createPartyIfMissing?: boolean
        }
        OnboardUserResponse: {
            /** @description The daml party id of the user that was onboarded. */
            party_id: string
        }
        GenerateExternalPartyTopologyRequest: {
            /** @description The actual party id will be constructed from this hint and a fingerprint of the public key. */
            party_hint: string
            /** @description hex-encoded ed25519 public key */
            public_key: string
        }
        GenerateExternalPartyTopologyResponse: {
            /** @description The generated party id of the external user. */
            party_id: string
            topology_txs: components['schemas']['TopologyTx'][]
        }
        TopologyTx: {
            /** @description base64 encoded topology transaction */
            topology_tx: string
            /** @description hex-encoded hash of the topology transaction */
            hash: string
        }
        SubmitExternalPartyTopologyRequest: {
            /** @description hex-encoded ed25519 public key */
            public_key: string
            signed_topology_txs: components['schemas']['SignedTopologyTx'][]
        }
        SubmitExternalPartyTopologyResponse: {
            party_id: string
        }
        SignedTopologyTx: {
            /**
             * @description base64 encoded topology transaction, this should be identical to the topology transaction
             *     received from the /v0/external-party-topology/generate endpoint.
             */
            topology_tx: string
            /**
             * @description hex-encoded ed25519 signature of the hash return by the generate endpoint in the form
             *     `${r}${s}`.
             */
            signed_hash: string
        }
        RegistrationRequest: Record<string, never> | null
        RegistrationResponse: {
            /** @description The party id of the user that was onboarded. */
            party_id: string
        }
        GetValidatorUserInfoResponse: {
            /** @description The daml party id of the validator operator. */
            party_id: string
            /** @description The ledger API user of the validator operator. */
            user_name: string
            featured: boolean
        }
        GetDecentralizedSynchronizerConnectionConfigResponse: {
            sequencer_connections: components['schemas']['SequencerConnections']
        }
        ListUsersResponse: {
            usernames: string[]
        }
        SequencerConnections: {
            connections: components['schemas']['SequencerAliasToConnections'][]
            /** Format: int32 */
            sequencer_trust_threshold: number
            /** Format: int32 */
            sequencer_liveness_margin: number
            submission_request_amplification: components['schemas']['SequencerSubmissionRequestAmplification']
        }
        SequencerAliasToConnections: {
            sequencer_alias: string
            endpoints: string[]
            transport_security: boolean
        }
        Dar: {
            hash: string
            /** @description base64 encoded string of a dar package */
            content: string
        }
        DomainMigrationDump: {
            participant: components['schemas']['NodeIdentitiesDump']
            participant_users: components['schemas']['ParticipantUsersData']
            /** @description base64 encoded string of acs snapshot for the requested party id */
            acs_snapshot: string
            acs_timestamp: string
            dars: components['schemas']['Dar'][]
            /** Format: int64 */
            migration_id: number
            domain_id: string
            created_at: string
            synchronizer_was_paused?: boolean
            /** @description If set to true, acs_snapshot is a filename */
            separate_payload_files?: boolean
            /** @enum {string} */
            acs_format?: 'admin_api' | 'ledger_api'
        }
        GetValidatorDomainDataSnapshotResponse: {
            data_snapshot: components['schemas']['DomainMigrationDump']
            /** Format: int64 */
            migration_id: number
        }
        SequencerSubmissionRequestAmplification: {
            factor: number
            patience_seconds: number
        }
        CreateExternalPartySetupProposalRequest: {
            user_party_id: string
        }
        CreateExternalPartySetupProposalResponse: {
            contract_id: components['schemas']['ContractId']
        }
        ListExternalPartySetupProposalsResponse: {
            contracts: components['schemas']['ContractWithState'][]
        }
        PrepareAcceptExternalPartySetupProposalRequest: {
            contract_id: components['schemas']['ContractId']
            user_party_id: string
            /**
             * @description When true, the response will contain additional details on how the transaction was encoded and hashed.
             *     This can be useful for troubleshooting of hash mismatches. Should only be used for debugging.
             * @default false
             */
            verbose_hashing: boolean
        }
        PrepareAcceptExternalPartySetupProposalResponse: {
            /**
             * @description base64-encoded transaction. The transaction corresponds to
             *     the protobuf definition of a `PreparedTransaction`
             *     https://github.com/digital-asset/canton/blob/main/community/ledger-api/src/main/protobuf/com/daml/ledger/api/v2/interactive_submission_data.proto#L18
             *     and can be decoded using standard protobuf libraries.
             */
            transaction: string
            /** @description Hex-encoded hash of the transaction */
            tx_hash: string
            /**
             * @description Optional additional details on how the transaction was encoded and hashed. Only set if verbose_hashing=true in the request.
             *     Note that there are no guarantees on the stability of the format or content of this field.
             *     Its content should NOT be parsed and should only be used for troubleshooting purposes.
             */
            hashing_details?: string
        }
        SubmitAcceptExternalPartySetupProposalRequest: {
            submission: components['schemas']['ExternalPartySubmission']
        }
        SubmitAcceptExternalPartySetupProposalResponse: {
            transfer_preapproval_contract_id: components['schemas']['ContractId']
            update_id: string
        }
        ExternalPartyBalanceResponse: {
            party_id: string
            total_unlocked_coin: string
            total_locked_coin: string
            total_coin_holdings: string
            accumulated_holding_fees_unlocked: string
            accumulated_holding_fees_locked: string
            accumulated_holding_fees_total: string
            total_available_coin: string
            /** Format: int64 */
            computed_as_of_round: number
        }
        ListTransferPreapprovalsResponse: {
            contracts: components['schemas']['ContractWithState'][]
        }
        LookupTransferPreapprovalByPartyResponse: {
            transfer_preapproval: components['schemas']['ContractWithState']
        }
        PrepareTransferPreapprovalSendRequest: {
            sender_party_id: string
            receiver_party_id: string
            amount: number
            /** Format: date-time */
            expires_at: string
            /**
             * Format: int64
             * @description The expected value of the counter that is used to order and deduplicate TransferCommands. Starts at 0 and  increases
             *     by 1 for each executed TransferCommand (independent of whether is succeeded or not). The most recent value can be read from scan
             *     through /v0/transfer-command-counter/{party}
             */
            nonce: number
            /**
             * @description When true, the response will contain additional details on how the transaction was encoded and hashed.
             *     This can be useful for troubleshooting of hash mismatches. Should only be used for debugging.
             * @default false
             */
            verbose_hashing: boolean
            description?: string
        }
        PrepareTransferPreapprovalSendResponse: {
            /**
             * @description base64-encoded transaction. The transaction corresponds to
             *     the protobuf definition of a `PreparedTransaction`
             *     https://github.com/digital-asset/canton/blob/main/community/ledger-api/src/main/protobuf/com/daml/ledger/api/v2/interactive_submission_data.proto#L18
             *     and can be decoded using standard protobuf libraries.
             */
            transaction: string
            /** @description Hex-encoded hash of the transaction */
            tx_hash: string
            /**
             * @description Prefix of the ContractId of the created TransferCommand. Matches the contract id of the corresponding `Create` node in the prepared transaction which
             *     also only contains the prefix. The final transaction observed on the update stream or in the result of looking up the transfer command status on Scan
             *     adds an additional suffix to the contract id.
             */
            transfer_command_contract_id_prefix: string
            /**
             * @description Optional additional details on how the transaction was encoded and hashed. Only set if verbose_hashing=true in the request.
             *     Note that there are no guarantees on the stability of the format or content of this field.
             *     Its content should NOT be parsed and should only be used for troubleshooting purposes.
             */
            hashing_details?: string
        }
        SubmitTransferPreapprovalSendRequest: {
            submission: components['schemas']['ExternalPartySubmission']
        }
        SubmitTransferPreapprovalSendResponse: {
            update_id: string
        }
        ExternalPartySubmission: {
            party_id: string
            /**
             * @description base64-encoded transaction. The transaction corresponds to
             *     the protobuf definition of a `PreparedTransaction`
             *     https://github.com/digital-asset/canton/blob/main/community/ledger-api/src/main/protobuf/com/daml/ledger/api/v2/interactive_submission_data.proto#L18
             *     and can be decoded using standard protobuf libraries.
             */
            transaction: string
            /**
             * @description hex-encoded ed25519 signature of the hash return by the prepare endpoint in the form
             *     `${r}${s}`.
             */
            signed_tx_hash: string
            /** @description hex-encoded ed25519 public key */
            public_key: string
        }
        ErrorResponse: {
            error: string
        }
        KeyPair: {
            keyPair: string
            name?: string
        }
        KmsKeyId: {
            /** @enum {string} */
            type: 'signing' | 'encryption'
            keyId: string
            name?: string
        }
        NodeKey:
            | components['schemas']['KeyPair']
            | components['schemas']['KmsKeyId']
        NodeIdentitiesDump: {
            id: string
            keys: components['schemas']['NodeKey'][]
            /** @description base64 encoded string of authorized store snapshot */
            authorizedStoreSnapshot: string
            version?: string
        }
        ParticipantIdentityProvider: {
            id: string
            /** @default false */
            isDeactivated: boolean
            jwksUrl: string
            issuer: string
            audience: string
        }
        ParticipantUserRight: {
            /** @enum {string} */
            kind:
                | 'participantAdmin'
                | 'canActAs'
                | 'canReadAs'
                | 'canExecuteAs'
                | 'identityProviderAdmin'
                | 'canReadAsAnyParty'
                | 'canExecuteAsAnyParty'
            party?: string
        }
        ParticipantUserAnnotation: {
            key: string
            value: string
        }
        ParticipantUser: {
            id: string
            primaryParty?: string
            rights: components['schemas']['ParticipantUserRight'][]
            /** @default false */
            isDeactivated: boolean
            annotations: components['schemas']['ParticipantUserAnnotation'][]
            /** @default  */
            identityProviderId: string
        }
        ParticipantUsersData: {
            identityProviders: components['schemas']['ParticipantIdentityProvider'][]
            users: components['schemas']['ParticipantUser'][]
        }
        Contract: {
            template_id: string
            contract_id: string
            payload: Record<string, never>
            created_event_blob: string
            created_at: string
        }
        ContractWithState: {
            contract: components['schemas']['Contract']
            domain_id?: string
        }
        ContractId: string
    }
    responses: {
        /** @description bad request */
        400: {
            headers: {
                [name: string]: unknown
            }
            content: {
                'application/json': components['schemas']['ErrorResponse']
            }
        }
        /** @description not found */
        404: {
            headers: {
                [name: string]: unknown
            }
            content: {
                'application/json': components['schemas']['ErrorResponse']
            }
        }
        /** @description conflict */
        409: {
            headers: {
                [name: string]: unknown
            }
            content: {
                'application/json': components['schemas']['ErrorResponse']
            }
        }
        /** @description internal server error */
        500: {
            headers: {
                [name: string]: unknown
            }
            content: {
                'application/json': components['schemas']['ErrorResponse']
            }
        }
        /** @description not implemented */
        501: {
            headers: {
                [name: string]: unknown
            }
            content: {
                'application/json': components['schemas']['ErrorResponse']
            }
        }
    }
    parameters: never
    requestBodies: never
    headers: never
    pathItems: never
}
export type $defs = Record<string, never>
export interface operations {
    isReady: {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        requestBody?: never
        responses: {
            /** @description ok */
            200: {
                headers: {
                    [name: string]: unknown
                }
                content?: never
            }
            /** @description service_unavailable */
            503: {
                headers: {
                    [name: string]: unknown
                }
                content?: never
            }
        }
    }
    isLive: {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        requestBody?: never
        responses: {
            /** @description ok */
            200: {
                headers: {
                    [name: string]: unknown
                }
                content?: never
            }
            /** @description service_unavailable */
            503: {
                headers: {
                    [name: string]: unknown
                }
                content?: never
            }
        }
    }
    getValidatorUserInfo: {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        requestBody?: never
        responses: {
            /** @description ok */
            200: {
                headers: {
                    [name: string]: unknown
                }
                content: {
                    'application/json': components['schemas']['GetValidatorUserInfoResponse']
                }
            }
        }
    }
    register: {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        requestBody?: {
            content: {
                'application/json': components['schemas']['RegistrationRequest']
            }
        }
        responses: {
            /** @description ok */
            200: {
                headers: {
                    [name: string]: unknown
                }
                content: {
                    'application/json': components['schemas']['RegistrationResponse']
                }
            }
        }
    }
    listUsers: {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        requestBody?: never
        responses: {
            /** @description ok */
            200: {
                headers: {
                    [name: string]: unknown
                }
                content: {
                    'application/json': components['schemas']['ListUsersResponse']
                }
            }
        }
    }
    onboardUser: {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        requestBody: {
            content: {
                'application/json': components['schemas']['OnboardUserRequest']
            }
        }
        responses: {
            /** @description ok */
            200: {
                headers: {
                    [name: string]: unknown
                }
                content: {
                    'application/json': components['schemas']['OnboardUserResponse']
                }
            }
        }
    }
    offboardUser: {
        parameters: {
            query: {
                username: string
            }
            header?: never
            path?: never
            cookie?: never
        }
        requestBody?: never
        responses: {
            /** @description ok */
            200: {
                headers: {
                    [name: string]: unknown
                }
                content?: never
            }
            404: components['responses']['404']
        }
    }
    dumpParticipantIdentities: {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        requestBody?: never
        responses: {
            /** @description ok */
            200: {
                headers: {
                    [name: string]: unknown
                }
                content: {
                    'application/json': components['schemas']['NodeIdentitiesDump']
                }
            }
        }
    }
    getDecentralizedSynchronizerConnectionConfig: {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        requestBody?: never
        responses: {
            /** @description ok */
            200: {
                headers: {
                    [name: string]: unknown
                }
                content: {
                    'application/json': components['schemas']['GetDecentralizedSynchronizerConnectionConfigResponse']
                }
            }
        }
    }
    getValidatorDomainDataSnapshot: {
        parameters: {
            query: {
                /**
                 * @description The timestamp as of which the dump (in particular, the ACS) is valid.
                 *
                 *     Must in the ISO-8601 format in UTC timezone, e.g.,
                 *     `yyyy-MM-dd'T'HH:mm:ss.SSS'Z'`.
                 */
                timestamp: string
                /** @description The current migration id. */
                migration_id?: number
                /**
                 * @description If true, do not check whether the provided timestamp is clean.
                 *     Not recommended for production,
                 *     see the `ExportAcs` endpoint of the `ParticipantRepairService` participant gRPC API.
                 */
                force?: boolean
            }
            header?: never
            path?: never
            cookie?: never
        }
        requestBody?: never
        responses: {
            /** @description ok */
            200: {
                headers: {
                    [name: string]: unknown
                }
                content: {
                    'application/json': components['schemas']['GetValidatorDomainDataSnapshotResponse']
                }
            }
            500: components['responses']['500']
        }
    }
    lookupTransferPreapprovalByParty: {
        parameters: {
            query?: never
            header?: never
            path: {
                'receiver-party': string
            }
            cookie?: never
        }
        requestBody?: never
        responses: {
            /** @description ok */
            200: {
                headers: {
                    [name: string]: unknown
                }
                content: {
                    'application/json': components['schemas']['LookupTransferPreapprovalByPartyResponse']
                }
            }
            404: components['responses']['404']
        }
    }
    cancelTransferPreapprovalByParty: {
        parameters: {
            query?: never
            header?: never
            path: {
                'receiver-party': string
            }
            cookie?: never
        }
        requestBody?: never
        responses: {
            /** @description ok */
            200: {
                headers: {
                    [name: string]: unknown
                }
                content?: never
            }
            404: components['responses']['404']
        }
    }
    listTransferPreapprovals: {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        requestBody?: never
        responses: {
            /** @description ok */
            200: {
                headers: {
                    [name: string]: unknown
                }
                content: {
                    'application/json': components['schemas']['ListTransferPreapprovalsResponse']
                }
            }
        }
    }
    prepareTransferPreapprovalSend: {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        requestBody: {
            content: {
                'application/json': components['schemas']['PrepareTransferPreapprovalSendRequest']
            }
        }
        responses: {
            /** @description ok */
            200: {
                headers: {
                    [name: string]: unknown
                }
                content: {
                    'application/json': components['schemas']['PrepareTransferPreapprovalSendResponse']
                }
            }
            400: components['responses']['400']
            404: components['responses']['404']
            501: components['responses']['501']
        }
    }
    submitTransferPreapprovalSend: {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        requestBody: {
            content: {
                'application/json': components['schemas']['SubmitTransferPreapprovalSendRequest']
            }
        }
        responses: {
            /** @description ok */
            200: {
                headers: {
                    [name: string]: unknown
                }
                content: {
                    'application/json': components['schemas']['SubmitTransferPreapprovalSendResponse']
                }
            }
            400: components['responses']['400']
            404: components['responses']['404']
            501: components['responses']['501']
        }
    }
    generateExternalPartyTopology: {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        requestBody: {
            content: {
                'application/json': components['schemas']['GenerateExternalPartyTopologyRequest']
            }
        }
        responses: {
            /** @description ok */
            200: {
                headers: {
                    [name: string]: unknown
                }
                content: {
                    'application/json': components['schemas']['GenerateExternalPartyTopologyResponse']
                }
            }
            501: components['responses']['501']
        }
    }
    submitExternalPartyTopology: {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        requestBody: {
            content: {
                'application/json': components['schemas']['SubmitExternalPartyTopologyRequest']
            }
        }
        responses: {
            /** @description ok */
            200: {
                headers: {
                    [name: string]: unknown
                }
                content: {
                    'application/json': components['schemas']['SubmitExternalPartyTopologyResponse']
                }
            }
            501: components['responses']['501']
        }
    }
    listExternalPartySetupProposals: {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        requestBody?: never
        responses: {
            /** @description ok */
            200: {
                headers: {
                    [name: string]: unknown
                }
                content: {
                    'application/json': components['schemas']['ListExternalPartySetupProposalsResponse']
                }
            }
            501: components['responses']['501']
        }
    }
    createExternalPartySetupProposal: {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        requestBody: {
            content: {
                'application/json': components['schemas']['CreateExternalPartySetupProposalRequest']
            }
        }
        responses: {
            /** @description ok */
            200: {
                headers: {
                    [name: string]: unknown
                }
                content: {
                    'application/json': components['schemas']['CreateExternalPartySetupProposalResponse']
                }
            }
            404: components['responses']['404']
            409: components['responses']['409']
            501: components['responses']['501']
        }
    }
    prepareAcceptExternalPartySetupProposal: {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        requestBody: {
            content: {
                'application/json': components['schemas']['PrepareAcceptExternalPartySetupProposalRequest']
            }
        }
        responses: {
            /** @description ok */
            200: {
                headers: {
                    [name: string]: unknown
                }
                content: {
                    'application/json': components['schemas']['PrepareAcceptExternalPartySetupProposalResponse']
                }
            }
            400: components['responses']['400']
            404: components['responses']['404']
            501: components['responses']['501']
        }
    }
    submitAcceptExternalPartySetupProposal: {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        requestBody: {
            content: {
                'application/json': components['schemas']['SubmitAcceptExternalPartySetupProposalRequest']
            }
        }
        responses: {
            /** @description ok */
            200: {
                headers: {
                    [name: string]: unknown
                }
                content: {
                    'application/json': components['schemas']['SubmitAcceptExternalPartySetupProposalResponse']
                }
            }
            404: components['responses']['404']
            501: components['responses']['501']
        }
    }
    getExternalPartyBalance: {
        parameters: {
            query: {
                party_id: string
            }
            header?: never
            path?: never
            cookie?: never
        }
        requestBody?: never
        responses: {
            /** @description ok */
            200: {
                headers: {
                    [name: string]: unknown
                }
                content: {
                    'application/json': components['schemas']['ExternalPartyBalanceResponse']
                }
            }
            404: components['responses']['404']
            501: components['responses']['501']
        }
    }
}
