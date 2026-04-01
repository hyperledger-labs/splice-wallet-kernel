// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    type SdkDarValidationContext,
    type SdkModuleDefinition,
} from '@canton-network/wallet-sdk'

export const SPLICE_DVP_TESTING_MODULE_NAME = 'splice.dvptesting' as const

export const SPLICE_DVP_TESTING_PACKAGE_ID =
    'e5c9847d5a88d3b8d65436f01765fc5ba142cc58529692e2dacdd865d9939f71' as const
export const SPLICE_DVP_TESTING_PACKAGE_NAME =
    'splice-token-test-trading-app' as const
export const SPLICE_DVP_TESTING_PACKAGE_VERSION = '1.0.0' as const

export const spliceDvpTestingTemplates = {
    OTCTradeProposal:
        '#splice-token-test-trading-app:Splice.Testing.Apps.TradingApp:OTCTradeProposal',
    OTCTrade:
        '#splice-token-test-trading-app:Splice.Testing.Apps.TradingApp:OTCTrade',
} as const

export const spliceDvpTestingChoices = {
    otcTradeProposalAccept: 'OTCTradeProposal_Accept',
    otcTradeProposalInitiateSettlement: 'OTCTradeProposal_InitiateSettlement',
    otcTradeSettle: 'OTCTrade_Settle',
} as const

type CreateCommand = {
    CreateCommand: {
        templateId: string
        createArguments: Record<string, unknown>
    }
}

type ExerciseCommand = {
    ExerciseCommand: {
        templateId: string
        contractId: string
        choice: string
        choiceArgument: Record<string, unknown>
    }
}

type TradeProposalArgs = {
    venue: string
    tradeCid: string | null
    transferLegs: Record<string, unknown>
    approvers: string[]
}

type SettleArgs = {
    contractId: string
    allocationsWithContext: Record<string, { _1: string; _2: unknown }>
}

export type SpliceDvpTestingModule = {
    name: typeof SPLICE_DVP_TESTING_MODULE_NAME
    templates: typeof spliceDvpTestingTemplates
    choices: typeof spliceDvpTestingChoices
    commands: {
        createTradeProposal: (args: TradeProposalArgs) => CreateCommand
        acceptTradeProposal: (args: {
            contractId: string
            approver: string
        }) => ExerciseCommand
        initiateSettlement: (args: {
            contractId: string
            prepareUntil: string
            settleBefore: string
        }) => ExerciseCommand
        settleTrade: (args: {
            contractId: string
            allocationsWithContext: Record<string, { _1: string; _2: unknown }>
        }) => ExerciseCommand
    }
}

export type SpliceNamespaceModule = {
    dvpTesting: SpliceDvpTestingModule
}

export type SpliceDvpModuleConfig = {
    skipVettedPackageValidation?: boolean
}

export function createSpliceDvpTestingModule(): SpliceDvpTestingModule {
    return {
        name: SPLICE_DVP_TESTING_MODULE_NAME,
        templates: spliceDvpTestingTemplates,
        choices: spliceDvpTestingChoices,
        commands: {
            createTradeProposal: (args: TradeProposalArgs) => ({
                CreateCommand: {
                    templateId: spliceDvpTestingTemplates.OTCTradeProposal,
                    createArguments: {
                        venue: args.venue,
                        tradeCid: args.tradeCid,
                        transferLegs: args.transferLegs,
                        approvers: args.approvers,
                    },
                },
            }),
            acceptTradeProposal: ({ contractId, approver }) => ({
                ExerciseCommand: {
                    templateId: spliceDvpTestingTemplates.OTCTradeProposal,
                    contractId,
                    choice: spliceDvpTestingChoices.otcTradeProposalAccept,
                    choiceArgument: { approver },
                },
            }),
            initiateSettlement: ({
                contractId,
                prepareUntil,
                settleBefore,
            }: {
                contractId: string
                prepareUntil: string
                settleBefore: string
            }) => ({
                ExerciseCommand: {
                    templateId: spliceDvpTestingTemplates.OTCTradeProposal,
                    contractId,
                    choice: spliceDvpTestingChoices.otcTradeProposalInitiateSettlement,
                    choiceArgument: { prepareUntil, settleBefore },
                },
            }),
            settleTrade: ({
                contractId,
                allocationsWithContext,
            }: SettleArgs) => ({
                ExerciseCommand: {
                    templateId: spliceDvpTestingTemplates.OTCTrade,
                    contractId,
                    choice: spliceDvpTestingChoices.otcTradeSettle,
                    choiceArgument: { allocationsWithContext },
                },
            }),
        },
    }
}

export const spliceDvpTestingModuleFactory = () =>
    createSpliceDvpTestingModule()

export const spliceDvpModule: SdkModuleDefinition<
    SpliceNamespaceModule,
    SdkDarValidationContext,
    SpliceDvpModuleConfig | undefined
> = {
    create: async (sdk, config) => {
        if (!config?.skipVettedPackageValidation) {
            await sdk.ledger.dar.validateExpectedVettedPackage({
                moduleName: SPLICE_DVP_TESTING_MODULE_NAME,
                packageName: SPLICE_DVP_TESTING_PACKAGE_NAME,
                packageVersion: SPLICE_DVP_TESTING_PACKAGE_VERSION,
                expectedPackageId: SPLICE_DVP_TESTING_PACKAGE_ID,
            })
        }

        return {
            dvpTesting: createSpliceDvpTestingModule(),
        }
    },
}

export const injectSpliceDvpTestingModule = createSpliceDvpTestingModule
