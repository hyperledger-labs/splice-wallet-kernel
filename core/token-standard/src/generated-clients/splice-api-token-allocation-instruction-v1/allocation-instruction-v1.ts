// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export interface paths {
    '/registry/allocation-instruction/v1/allocation-factory': {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        get?: never
        put?: never
        /** @description Get the factory and choice context for creating allocations using the `AllocationFactory_Allocate` choice. */
        post: operations['getAllocationFactory']
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
        GetFactoryRequest: {
            /**
             * @description The arguments that are intended to be passed to the choice provided by the factory.
             *     To avoid repeating the Daml type definitions, they are specified as JSON objects.
             *     However the concrete format is given by how the choice arguments are encoded using the Daml JSON API
             *     (with the `extraArgs.context` and `extraArgs.meta` fields set to the empty object).
             *
             *     The choice arguments are provided so that the registry can also provide choice-argument
             *     specific contracts, e.g., the configuration for a specific instrument-id.
             */
            choiceArguments: Record<string, never>
            /**
             * @description If set to true, the response will not include fields prefixed with 'debug'. Useful to save bandwidth.
             * @default false
             */
            excludeDebugFields: boolean
        }
        /**
         * @description A factory contract together with the choice context required to exercise the choice
         *     provided by the factory. Typically used to implement the generic initiation of on-ledger workflows
         *     via a Daml interface.
         *
         *     Clients SHOULD avoid reusing the same `FactoryWithChoiceContext` for exercising multiple choices,
         *     as the choice context MAY be specific to the choice being exercised.
         */
        FactoryWithChoiceContext: {
            /** @description The contract ID of the contract implementing the factory interface. */
            factoryId: string
            choiceContext: components['schemas']['ChoiceContext']
        }
        /**
         * @description The context required to exercise a choice on a contract via an interface.
         *     Used to retrieve additional reference date that is passed in via disclosed contracts,
         *     which are in turn referred to via their contract ID in the `choiceContextData`.
         */
        ChoiceContext: {
            /** @description The additional data to use when exercising the choice. */
            choiceContextData: Record<string, never>
            /**
             * @description The contracts that are required to be disclosed to the participant node for exercising
             *     the choice.
             */
            disclosedContracts: components['schemas']['DisclosedContract'][]
        }
        DisclosedContract: {
            templateId: string
            contractId: string
            createdEventBlob: string
            /**
             * @description The synchronizer to which the contract is currently assigned.
             *     If the contract is in the process of being reassigned, then a "409" response is returned.
             */
            synchronizerId: string
            /**
             * @description The name of the Daml package that was used to create the contract.
             *     Use this data only if you trust the provider, as it might not match the data in the
             *     `createdEventBlob`.
             */
            debugPackageName?: string
            /**
             * @description The contract arguments that were used to create the contract.
             *     Use this data only if you trust the provider, as it might not match the data in the
             *     `createdEventBlob`.
             */
            debugPayload?: Record<string, never>
            /**
             * Format: date-time
             * @description The ledger effective time at which the contract was created.
             *     Use this data only if you trust the provider, as it might not match the data in the
             *     `createdEventBlob`.
             */
            debugCreatedAt?: string
        }
        ErrorResponse: {
            error: string
        }
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
    }
    parameters: never
    requestBodies: never
    headers: never
    pathItems: never
}
export type $defs = Record<string, never>
export interface operations {
    getAllocationFactory: {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        requestBody: {
            content: {
                'application/json': components['schemas']['GetFactoryRequest']
            }
        }
        responses: {
            /** @description ok */
            200: {
                headers: {
                    [name: string]: unknown
                }
                content: {
                    'application/json': components['schemas']['FactoryWithChoiceContext']
                }
            }
            400: components['responses']['400']
            404: components['responses']['404']
        }
    }
}
