// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export interface paths {
    '/v0/scan-proxy/dso-party-id': {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        get: operations['getDsoPartyId']
        put?: never
        post?: never
        delete?: never
        options?: never
        head?: never
        patch?: never
        trace?: never
    }
    '/v0/scan-proxy/dso': {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        get: operations['getDsoInfo']
        put?: never
        post?: never
        delete?: never
        options?: never
        head?: never
        patch?: never
        trace?: never
    }
    '/v0/scan-proxy/featured-apps/{provider_party_id}': {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        get: operations['lookupFeaturedAppRight']
        put?: never
        post?: never
        delete?: never
        options?: never
        head?: never
        patch?: never
        trace?: never
    }
    '/v0/scan-proxy/open-and-issuing-mining-rounds': {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        get: operations['getOpenAndIssuingMiningRounds']
        put?: never
        post?: never
        delete?: never
        options?: never
        head?: never
        patch?: never
        trace?: never
    }
    '/v0/scan-proxy/amulet-rules': {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        get: operations['getAmuletRules']
        put?: never
        post?: never
        delete?: never
        options?: never
        head?: never
        patch?: never
        trace?: never
    }
    '/v0/scan-proxy/ans-entries/by-party/{party}': {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        get: operations['lookupAnsEntryByParty']
        put?: never
        post?: never
        delete?: never
        options?: never
        head?: never
        patch?: never
        trace?: never
    }
    '/v0/scan-proxy/ans-entries': {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        get: operations['listAnsEntries']
        put?: never
        post?: never
        delete?: never
        options?: never
        head?: never
        patch?: never
        trace?: never
    }
    '/v0/scan-proxy/ans-entries/by-name/{name}': {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        get: operations['lookupAnsEntryByName']
        put?: never
        post?: never
        delete?: never
        options?: never
        head?: never
        patch?: never
        trace?: never
    }
    '/v0/scan-proxy/ans-rules': {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        get?: never
        put?: never
        post: operations['getAnsRules']
        delete?: never
        options?: never
        head?: never
        patch?: never
        trace?: never
    }
    '/v0/scan-proxy/transfer-preapprovals/by-party/{party}': {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        get: operations['lookupTransferPreapprovalByParty']
        put?: never
        post?: never
        delete?: never
        options?: never
        head?: never
        patch?: never
        trace?: never
    }
    '/v0/scan-proxy/transfer-command-counter/{party}': {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        get: operations['lookupTransferCommandCounterByParty']
        put?: never
        post?: never
        delete?: never
        options?: never
        head?: never
        patch?: never
        trace?: never
    }
    '/v0/scan-proxy/transfer-command/status': {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        /** @description Retrieve the status of all transfer commands of the given sender for the specified nonce. */
        get: operations['lookupTransferCommandStatus']
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
        ContractWithState: {
            contract: components['schemas']['Contract']
            domain_id?: string
        }
        GetDsoInfoResponse: {
            /** @description User ID representing the SV */
            sv_user: string
            /** @description Party representing the SV */
            sv_party_id: string
            /**
             * @description Party representing the whole DSO; for Scan only, also returned by
             *     `/v0/dso-party-id`
             */
            dso_party_id: string
            /**
             * @description Threshold required to pass vote requests; also known as the
             *     "governance threshold", it is always derived from the number of
             *     `svs` in `dso_rules`
             */
            voting_threshold: number
            /**
             * @description Contract of the Daml template `Splice.Round.OpenMiningRound`, the
             *     one with the highest round number on the ledger that has been signed
             *     by `dso_party_id`. The round may not be usable as it may not be
             *     opened yet, in accordance with its `opensAt` template field
             */
            latest_mining_round: components['schemas']['ContractWithState']
            /**
             * @description Contract of the Daml template `Splice.AmuletRules.AmuletRules`,
             *     including the full schedule of `AmuletConfig` changes approved by
             *     the DSO. Callers should not assume that `initialValue` is up-to-date,
             *     and should instead search `futureValues` for the latest configuration
             *     valid as of now
             */
            amulet_rules: components['schemas']['ContractWithState']
            /**
             * @description Contract of the Daml template `Splice.DsoRules.DsoRules`, listing
             *     the governance rules approved by the DSO governing this Splice network.
             */
            dso_rules: components['schemas']['ContractWithState']
            /**
             * @description For every one of `svs` listed in `dso_rules`, a contract of the Daml
             *     template `Splice.DSO.SvState.SvNodeState`. This does not include
             *     states for offboarded SVs, though they may still have an on-ledger
             *     state contract
             */
            sv_node_states: components['schemas']['ContractWithState'][]
            /** @description Initial round from which the network bootstraps */
            initial_round?: string
        }
        /** @description If defined, a contract of Daml template `Splice.Amulet.FeaturedAppRight`. */
        LookupFeaturedAppRightResponse: {
            featured_app_right?: components['schemas']['Contract']
        }
        AnsEntry: {
            /**
             * @description If present, Daml contract ID of template `Splice.Ans:AnsEntry`.
             *     If absent, this is a DSO-provided entry for either the DSO or an SV.
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
             *     new `contract_id` and `expires_at`.
             *     If `null` or absent, does not expire; this is the case only for
             *     special entries provided by the DSO.
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
             *     created:
             *       The transfer command has been created and is waiting for automation to complete it.
             *     sent:
             *       The transfer command has been completed and the transfer to the receiver has finished.
             *     failed:
             *       The transfer command has failed permanently and nothing has been transferred. Refer to
             *       failure_reason for details. A new transfer command can be created.
             */
            status: string
        }
        TransferCommandCreatedResponse: components['schemas']['BaseLookupTransferCommandStatusResponse'] & {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            status: 'created'
        }
        TransferCommandSentResponse: components['schemas']['BaseLookupTransferCommandStatusResponse'] & {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            status: 'sent'
        }
        TransferCommandFailedResponse: components['schemas']['BaseLookupTransferCommandStatusResponse'] & {
            /**
             * @description The reason for the failure of the TransferCommand.
             *     failed:
             *       Completing the transfer failed, check the reason for details.
             *     withdrawn:
             *       The sender has withdrawn the TransferCommand before it could be completed.
             *     expired:
             *       The expiry time on the TransferCommand was reached before it could be completed.
             * @enum {string}
             */
            failure_kind: 'failed' | 'expired' | 'withdrawn'
            /** @description Human readable description of the failure */
            reason: string
        } & {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            status: 'failed'
        }
        TransferCommandContractStatus:
            | components['schemas']['TransferCommandCreatedResponse']
            | components['schemas']['TransferCommandSentResponse']
            | components['schemas']['TransferCommandFailedResponse']
        /**
         * @description A contract of Daml template `Splice.ExternalPartyAmuletRules:TransferCommand`,
         *     and its status determined by the latest transactions.
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
    getDsoPartyId: {
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
                    'application/json': components['schemas']['GetDsoPartyIdResponse']
                }
            }
        }
    }
    getDsoInfo: {
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
                    'application/json': components['schemas']['GetDsoInfoResponse']
                }
            }
        }
    }
    lookupFeaturedAppRight: {
        parameters: {
            query?: never
            header?: never
            path: {
                provider_party_id: string
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
                    'application/json': components['schemas']['LookupFeaturedAppRightResponse']
                }
            }
        }
    }
    getOpenAndIssuingMiningRounds: {
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
                    'application/json': components['schemas']['GetOpenAndIssuingMiningRoundsProxyResponse']
                }
            }
        }
    }
    getAmuletRules: {
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
                    'application/json': components['schemas']['GetAmuletRulesProxyResponse']
                }
            }
        }
    }
    lookupAnsEntryByParty: {
        parameters: {
            query?: never
            header?: never
            path: {
                party: string
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
                    'application/json': components['schemas']['ListEntriesResponse']
                }
            }
        }
    }
    lookupAnsEntryByName: {
        parameters: {
            query?: never
            header?: never
            path: {
                name: string
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
                    'application/json': components['schemas']['LookupEntryByNameResponse']
                }
            }
            404: components['responses']['404']
        }
    }
    getAnsRules: {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        requestBody: {
            content: {
                'application/json': components['schemas']['GetAnsRulesRequest']
            }
        }
        responses: {
            /** @description ok */
            200: {
                headers: {
                    [name: string]: unknown
                }
                content: {
                    'application/json': components['schemas']['GetAnsRulesResponse']
                }
            }
        }
    }
    lookupTransferPreapprovalByParty: {
        parameters: {
            query?: never
            header?: never
            path: {
                party: string
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
    lookupTransferCommandCounterByParty: {
        parameters: {
            query?: never
            header?: never
            path: {
                party: string
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
                    'application/json': components['schemas']['LookupTransferCommandCounterByPartyResponse']
                }
            }
            /** @description No TransferCommandCounter exists for this party. This means the nonce that should be used is 0. */
            404: components['responses']['404']
        }
    }
    lookupTransferCommandStatus: {
        parameters: {
            query: {
                sender: string
                nonce: number
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
                    'application/json': components['schemas']['LookupTransferCommandStatusResponse']
                }
            }
            /** @description No TransferCommand exists with this contract id within the last 24h */
            404: components['responses']['404']
        }
    }
}
