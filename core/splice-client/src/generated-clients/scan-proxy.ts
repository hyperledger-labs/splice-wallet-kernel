// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export interface paths {
    '/v0/scan-proxy/dso-party-id': {
        get: operations['getDsoPartyId']
    }
    '/v0/scan-proxy/featured-apps/{provider_party_id}': {
        get: operations['lookupFeaturedAppRight']
    }
    '/v0/scan-proxy/open-and-issuing-mining-rounds': {
        get: operations['getOpenAndIssuingMiningRounds']
    }
    '/v0/scan-proxy/amulet-rules': {
        get: operations['getAmuletRules']
    }
    '/v0/scan-proxy/ans-entries/by-party/{party}': {
        get: operations['lookupAnsEntryByParty']
    }
    '/v0/scan-proxy/ans-entries': {
        get: operations['listAnsEntries']
    }
    '/v0/scan-proxy/ans-entries/by-name/{name}': {
        get: operations['lookupAnsEntryByName']
    }
    '/v0/scan-proxy/ans-rules': {
        post: operations['getAnsRules']
    }
    '/v0/scan-proxy/transfer-preapprovals/by-party/{party}': {
        get: operations['lookupTransferPreapprovalByParty']
    }
    '/v0/scan-proxy/transfer-command-counter/{party}': {
        get: operations['lookupTransferCommandCounterByParty']
    }
    '/v0/scan-proxy/transfer-command/status': {
        /** @description Retrieve the status of all transfer commands of the given sender for the specified nonce. */
        get: operations['lookupTransferCommandStatus']
    }
}

export type webhooks = Record<string, never>

export interface components {
    schemas: {
        GetOpenAndIssuingMiningRoundsProxyResponse: {
            open_mining_rounds: components['schemas']['ContractWithState'][]
            issuing_mining_rounds: components['schemas']['ContractWithState'][]
        }
        GetAmuletRulesProxyResponse: {
            amulet_rules: components['schemas']['ContractWithState']
        }
        GetDsoPartyIdResponse: {
            dso_party_id: string
        }
        Contract: {
            template_id: string
            contract_id: string
            payload: Record<string, never>
            created_event_blob: string
            created_at: string
        }
        /** @description If defined, a contract of Daml template `Splice.Amulet.FeaturedAppRight`. */
        LookupFeaturedAppRightResponse: {
            featured_app_right?: components['schemas']['Contract']
        }
        ContractWithState: {
            contract: components['schemas']['Contract']
            domain_id?: string
        }
        AnsEntry: {
            /**
             * @description If present, Daml contract ID of template `Splice.Ans:AnsEntry`.
             * If absent, this is a DSO-provided entry for either the DSO or an SV.
             */
            contract_id?: string
            /** @description Owner party ID of this ANS entry. */
            user: string
            /** @description The ANS entry name. */
            name: string
            /** @description Either empty, or an http/https URL supplied by the `user`. */
            url: string
            /** @description Arbitrary description text supplied by `user`; may be empty. */
            description: string
            /**
             * Format: date-time
             * @description Time after which this ANS entry expires; if renewed, it will have a
             * new `contract_id` and `expires_at`.
             * If `null` or absent, does not expire; this is the case only for
             * special entries provided by the DSO.
             */
            expires_at?: string
        }
        LookupEntryByPartyResponse: {
            entry: components['schemas']['AnsEntry']
        }
        ErrorResponse: {
            error: string
        }
        ListEntriesResponse: {
            entries: components['schemas']['AnsEntry'][]
        }
        LookupEntryByNameResponse: {
            entry: components['schemas']['AnsEntry']
        }
        ContractId: string
        GetAnsRulesRequest: {
            cached_ans_rules_contract_id?: components['schemas']['ContractId']
            cached_ans_rules_domain_id?: string
        }
        MaybeCachedContractWithState: {
            contract?: components['schemas']['Contract']
            domain_id?: string
        }
        /** @description A contract state update of Daml template `Splice.Ans.AnsRules`. */
        GetAnsRulesResponse: {
            ans_rules_update: components['schemas']['MaybeCachedContractWithState']
        }
        /** @description A Daml contract of template `Splice.AmuletRules:TransferPreapproval`. */
        LookupTransferPreapprovalByPartyResponse: {
            transfer_preapproval: components['schemas']['ContractWithState']
        }
        /** @description A Daml contract of template `Splice.ExternalPartyAmuletRules:TransferCommandCounter`. */
        LookupTransferCommandCounterByPartyResponse: {
            transfer_command_counter: components['schemas']['ContractWithState']
        }
        BaseLookupTransferCommandStatusResponse: {
            /**
             * @description The status of the transfer command.
             * created:
             *   The transfer command has been created and is waiting for automation to complete it.
             * sent:
             *   The transfer command has been completed and the transfer to the receiver has finished.
             * failed:
             *   The transfer command has failed permanently and nothing has been transferred. Refer to
             *   failure_reason for details. A new transfer command can be created.
             */
            status: string
        }
        TransferCommandCreatedResponse: components['schemas']['BaseLookupTransferCommandStatusResponse']
        TransferCommandSentResponse: components['schemas']['BaseLookupTransferCommandStatusResponse']
        TransferCommandFailedResponse: components['schemas']['BaseLookupTransferCommandStatusResponse'] & {
            /**
             * @description The reason for the failure of the TransferCommand.
             * failed:
             *   Completing the transfer failed, check the reason for details.
             * withdrawn:
             *   The sender has withdrawn the TransferCommand before it could be completed.
             * expired:
             *   The expiry time on the TransferCommand was reached before it could be completed.
             *
             * @enum {string}
             */
            failure_kind: 'failed' | 'expired' | 'withdrawn'
            /** @description Human readable description of the failure */
            reason: string
        }
        TransferCommandContractStatus:
            | components['schemas']['TransferCommandCreatedResponse']
            | components['schemas']['TransferCommandSentResponse']
            | components['schemas']['TransferCommandFailedResponse']
        /**
         * @description A contract of Daml template `Splice.ExternalPartyAmuletRules:TransferCommand`,
         * and its status determined by the latest transactions.
         */
        TransferCommandContractWithStatus: {
            contract: components['schemas']['Contract']
            status: components['schemas']['TransferCommandContractStatus']
        }
        TransferCommandMap: {
            [
                key: string
            ]: components['schemas']['TransferCommandContractWithStatus']
        }
        LookupTransferCommandStatusResponse: {
            transfer_commands_by_contract_id: components['schemas']['TransferCommandMap']
        }
    }
    responses: {
        /** @description not found */
        404: {
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

export type external = Record<string, never>

export interface operations {
    getDsoPartyId: {
        responses: {
            /** @description ok */
            200: {
                content: {
                    'application/json': components['schemas']['GetDsoPartyIdResponse']
                }
            }
        }
    }
    lookupFeaturedAppRight: {
        parameters: {
            path: {
                provider_party_id: string
            }
        }
        responses: {
            /** @description ok */
            200: {
                content: {
                    'application/json': components['schemas']['LookupFeaturedAppRightResponse']
                }
            }
        }
    }
    getOpenAndIssuingMiningRounds: {
        responses: {
            /** @description ok */
            200: {
                content: {
                    'application/json': components['schemas']['GetOpenAndIssuingMiningRoundsProxyResponse']
                }
            }
        }
    }
    getAmuletRules: {
        responses: {
            /** @description ok */
            200: {
                content: {
                    'application/json': components['schemas']['GetAmuletRulesProxyResponse']
                }
            }
        }
    }
    lookupAnsEntryByParty: {
        parameters: {
            path: {
                party: string
            }
        }
        responses: {
            /** @description ok */
            200: {
                content: {
                    'application/json': components['schemas']['LookupEntryByPartyResponse']
                }
            }
            404: components['responses']['404']
        }
    }
    listAnsEntries: {
        parameters: {
            query: {
                name_prefix?: string
                page_size: number
            }
        }
        responses: {
            /** @description ok */
            200: {
                content: {
                    'application/json': components['schemas']['ListEntriesResponse']
                }
            }
        }
    }
    lookupAnsEntryByName: {
        parameters: {
            path: {
                name: string
            }
        }
        responses: {
            /** @description ok */
            200: {
                content: {
                    'application/json': components['schemas']['LookupEntryByNameResponse']
                }
            }
            404: components['responses']['404']
        }
    }
    getAnsRules: {
        requestBody: {
            content: {
                'application/json': components['schemas']['GetAnsRulesRequest']
            }
        }
        responses: {
            /** @description ok */
            200: {
                content: {
                    'application/json': components['schemas']['GetAnsRulesResponse']
                }
            }
        }
    }
    lookupTransferPreapprovalByParty: {
        parameters: {
            path: {
                party: string
            }
        }
        responses: {
            /** @description ok */
            200: {
                content: {
                    'application/json': components['schemas']['LookupTransferPreapprovalByPartyResponse']
                }
            }
            404: components['responses']['404']
        }
    }
    lookupTransferCommandCounterByParty: {
        parameters: {
            path: {
                party: string
            }
        }
        responses: {
            /** @description ok */
            200: {
                content: {
                    'application/json': components['schemas']['LookupTransferCommandCounterByPartyResponse']
                }
            }
            /** @description No TransferCommandCounter exists for this party. This means the nonce that should be used is 0. */
            404: components['responses']['404']
        }
    }
    /** @description Retrieve the status of all transfer commands of the given sender for the specified nonce. */
    lookupTransferCommandStatus: {
        parameters: {
            query: {
                sender: string
                nonce: number
            }
        }
        responses: {
            /** @description ok */
            200: {
                content: {
                    'application/json': components['schemas']['LookupTransferCommandStatusResponse']
                }
            }
            /** @description No TransferCommand exists with this contract id within the last 24h */
            404: components['responses']['404']
        }
    }
}
