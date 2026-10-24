// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export interface paths {
    '/registry/traffic-purchase/v1/traffic-purchaser': {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        /**
         * @description The `TrafficPurchaser` this paymaster sells through, and the party payments are
         *     transferred to.
         */
        get: operations['getTrafficPurchaser']
        put?: never
        post?: never
        delete?: never
        options?: never
        head?: never
        patch?: never
        trace?: never
    }
    '/registry/traffic-purchase/v1/conversion-rates/{instrumentId}': {
        parameters: {
            query?: never
            header?: never
            path?: never
            cookie?: never
        }
        /**
         * @description The live `ConversionRate` at which this paymaster sells traffic for one instrument.
         *     A paymaster that does not accept the instrument answers 404.
         */
        get: operations['getConversionRate']
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
        /**
         * @description The paymaster's purchaser contract, with everything a buyer needs in order to
         *     exercise `TrafficPurchaser_PurchaseCredits` on it.
         */
        TrafficPurchaserWithDisclosures: {
            /** @description Contract id of the `Tea.TrafficPurchase:TrafficPurchaser`. */
            trafficPurchaserId: string
            /** @description The party selling traffic, and sole signatory of both templates. */
            paymaster: string
            /**
             * @description The party payments are transferred to, as the purchaser contract names it.
             *
             *     Stated here rather than read off the contract because the buyer cannot read
             *     it, and because the token registry has to be asked about a transfer to a
             *     *specific* receiver before anything is submitted.
             */
            paymasterReceiver: string
            /** @description The contracts a submission exercising this purchaser has to disclose. */
            disclosedContracts: components['schemas']['DisclosedContract'][]
        }
        /**
         * @description One live rate, with its terms as the ledger renders them.
         *
         *     The terms are reported, not just the contract id, because a buyer has to price the
         *     purchase before the token registry is asked about the payment -- so it needs the
         *     rate as a figure, not only as a contract to name.
         */
        ConversionRateWithDisclosures: {
            /** @description Contract id of the `Tea.TrafficPurchase:ConversionRate`. */
            conversionRateId: string
            instrumentId: components['schemas']['InstrumentId']
            /**
             * @description Traffic bytes per unit of the payment asset, as a Daml `Decimal`: a base-10
             *     string with no exponent, e.g. `1048576.0` for 1 MiB per unit. Positive.
             */
            conversionRate: string
            /**
             * Format: date-time
             * @description When the rate stops being usable. Absent for an open-ended rate, which is
             *     Daml `None`.
             */
            expiresAt?: string
            /**
             * @description Ceiling on a single purchase, in bytes, as a Daml `Decimal`. Absent for an
             *     unbounded one, which is Daml `None`.
             */
            maxTrafficPerPurchase?: string
            /** @description The contracts a submission buying at this rate has to disclose. */
            disclosedContracts: components['schemas']['DisclosedContract'][]
        }
        /**
         * @description A token-standard instrument, as the Daml model keys it: the registry that
         *     administers it, and its id there.
         */
        InstrumentId: {
            admin: string
            id: string
        }
        /**
         * @description A contract to disclose to the participant node, as the Ledger API takes it.
         *
         *     Deliberately carries none of the `debug*` fields splice's own `DisclosedContract`
         *     has. Those are only safe there because every caller suppresses them with
         *     `excludeDebugFields: true` in a request body, and a GET has nowhere to put that
         *     flag. Leaving them out keeps this shape one a submission can carry as-is.
         */
        DisclosedContract: {
            templateId: string
            contractId: string
            createdEventBlob: string
            /** @description The synchronizer the contract is currently assigned to. */
            synchronizerId: string
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
        /** @description internal server error */
        500: {
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
    getTrafficPurchaser: {
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
                    'application/json': components['schemas']['TrafficPurchaserWithDisclosures']
                }
            }
            404: components['responses']['404']
            500: components['responses']['500']
        }
    }
    getConversionRate: {
        parameters: {
            query: {
                /**
                 * @description The party administering the instrument.
                 *
                 *     Required, because it is half of the key: the Daml model keys a rate by the
                 *     `{ admin, id }` pair, and an id on its own does not identify an instrument.
                 */
                admin: string
            }
            header?: never
            path: {
                /** @description The instrument's id at its administrator, e.g. `Amulet`. */
                instrumentId: string
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
                    'application/json': components['schemas']['ConversionRateWithDisclosures']
                }
            }
            400: components['responses']['400']
            404: components['responses']['404']
            500: components['responses']['500']
        }
    }
}
