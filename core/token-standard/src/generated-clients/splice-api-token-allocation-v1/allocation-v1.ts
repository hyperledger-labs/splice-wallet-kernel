// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export interface paths {
    '/registry/allocations/v1/{allocationId}/choice-contexts/execute-transfer': {
        /** @description Get the choice context to execute a transfer on an allocation. */
        post: operations['getAllocationTransferContext']
    }
    '/registry/allocations/v1/{allocationId}/choice-contexts/withdraw': {
        /** @description Get the choice context to withdraw an allocation. */
        post: operations['getAllocationWithdrawContext']
    }
    '/registry/allocations/v1/{allocationId}/choice-contexts/cancel': {
        /** @description Get the choice context to cancel an allocation. */
        post: operations['getAllocationCancelContext']
    }
}

export type webhooks = Record<string, never>

export interface components {
    schemas: {
        /** @description A request to get the context for executing a choice on a contract. */
        GetChoiceContextRequest: {
            /**
             * @description Metadata that will be passed to the choice, and should be incorporated
             * into the choice context. Provided for extensibility.
             */
            meta?: {
                [key: string]: string
            }
        }
        /**
         * @description The context required to exercise a choice on a contract via an interface.
         * Used to retrieve additional reference date that is passed in via disclosed contracts,
         * which are in turn referred to via their contract ID in the `choiceContextData`.
         */
        ChoiceContext: {
            /** @description The additional data to use when exercising the choice. */
            choiceContextData: Record<string, never>
            /**
             * @description The contracts that are required to be disclosed to the participant node for exercising
             * the choice.
             */
            disclosedContracts: components['schemas']['DisclosedContract'][]
        }
        DisclosedContract: {
            templateId: string
            contractId: string
            createdEventBlob: string
            /**
             * @description The synchronizer to which the contract is currently assigned.
             * If the contract is in the process of being reassigned, then a "409" response is returned.
             */
            synchronizerId: string
            /**
             * @description The name of the Daml package that was used to create the contract.
             * Use this data only if you trust the provider, as it might not match the data in the
             * `createdEventBlob`.
             */
            debugPackageName?: string
            /**
             * @description The contract arguments that were used to create the contract.
             * Use this data only if you trust the provider, as it might not match the data in the
             * `createdEventBlob`.
             */
            debugPayload?: Record<string, never>
            /**
             * Format: date-time
             * @description The ledger effective time at which the contract was created.
             * Use this data only if you trust the provider, as it might not match the data in the
             * `createdEventBlob`.
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
            content: {
                'application/json': components['schemas']['ErrorResponse']
            }
        }
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
    /** @description Get the choice context to execute a transfer on an allocation. */
    getAllocationTransferContext: {
        parameters: {
            path: {
                /** @description The contract ID of the allocation whose transfer the caller wants to execute. */
                allocationId: string
            }
        }
        requestBody: {
            content: {
                'application/json': components['schemas']['GetChoiceContextRequest']
            }
        }
        responses: {
            /** @description ok */
            200: {
                content: {
                    'application/json': components['schemas']['ChoiceContext']
                }
            }
            400: components['responses']['400']
            404: components['responses']['404']
        }
    }
    /** @description Get the choice context to withdraw an allocation. */
    getAllocationWithdrawContext: {
        parameters: {
            path: {
                /** @description The contract ID of the allocation to withdraw. */
                allocationId: string
            }
        }
        requestBody: {
            content: {
                'application/json': components['schemas']['GetChoiceContextRequest']
            }
        }
        responses: {
            /** @description ok */
            200: {
                content: {
                    'application/json': components['schemas']['ChoiceContext']
                }
            }
            400: components['responses']['400']
            404: components['responses']['404']
        }
    }
    /** @description Get the choice context to cancel an allocation. */
    getAllocationCancelContext: {
        parameters: {
            path: {
                /** @description The contract ID of the allocation to cancel. */
                allocationId: string
            }
        }
        requestBody: {
            content: {
                'application/json': components['schemas']['GetChoiceContextRequest']
            }
        }
        responses: {
            /** @description ok */
            200: {
                content: {
                    'application/json': components['schemas']['ChoiceContext']
                }
            }
            400: components['responses']['400']
            404: components['responses']['404']
        }
    }
}
