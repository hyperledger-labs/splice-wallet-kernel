// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { WalletSdkContext } from '../../../sdk.js'
import { MergeUtxosParams, ListHoldingsParams } from './types.js'
import {
    HOLDING_INTERFACE_ID,
    Metadata,
} from '@canton-network/core-token-standard'
import {
    DisclosedContract,
    ExerciseCommand,
    TokenStandardService,
} from '@canton-network/core-token-standard-service'
import { Holding, PrettyContract } from '@canton-network/core-tx-parser'
import { WrappedCommand } from '../../ledger/types.js'
import { Types } from '@canton-network/core-ledger-client'
import { Decimal } from 'decimal.js'
import { TransferService } from '../transfer/index.js'
import { PartyId } from '@canton-network/core-types'
import { Ledger } from '../../ledger/client.js'
import { TransactionFilterBySetup } from '@canton-network/core-ledger-client-types'

export class UtxoService {
    private readonly ledger: Ledger
    constructor(
        private readonly sdkContext: WalletSdkContext,
        private readonly transfer: TransferService // Type this as your Transfer service
    ) {
        this.ledger = new Ledger(sdkContext)
    }

    /**
     * Merges utxos by instrument
     * @param partyId partyId to create the transfer command for
     * @param inputUtxos optional utxos to provide as input (e.g. if you're already listing holdings and don't want to repeat the call)
     * @param nodeLimit json api maximum elements limit per node, default is 200
     * @returns an array of exercise commands, where each command can have up to 100 self-transfers
     * these need to be submitted separately as there is a limit of 100 transfers per execution
     */
    async merge(
        params: MergeUtxosParams
    ): Promise<
        [WrappedCommand<'ExerciseCommand'>[], Types['DisclosedContract'][]]
    > {
        const utxos =
            params.inputUtxos ??
            (await this.list({
                partyId: params.partyId,
                includeLocked: false,
                limit: params.nodeLimit ?? 200,
            }))

        const utxoGroupedByInstrument: Record<
            string,
            PrettyContract<Holding>[] | undefined
        > = Object.groupBy(
            utxos,
            (utxo) =>
                `${utxo.interfaceViewValue.instrumentId.id}::${utxo.interfaceViewValue.instrumentId.admin}`
        )

        const transferInputUtxoLimit = 100
        const allTransferResults = []

        for (const group of Object.values(utxoGroupedByInstrument)) {
            if (!group) continue
            const { id: instrumentId } =
                group[0].interfaceViewValue.instrumentId

            const registryUrl = new URL(
                (await this.sdkContext.asset.find(instrumentId)).registryUrl
            )

            const transfers = Math.ceil(group.length / transferInputUtxoLimit)

            const transferPromises = Array.from(
                { length: transfers },
                (_, i) => {
                    const start = i * transferInputUtxoLimit
                    const end = Math.min(
                        start + transferInputUtxoLimit,
                        group.length
                    )

                    const inputUtxos = group.slice(start, end)

                    const accumulatedAmount = inputUtxos.reduce(
                        (a, b) => a.plus(b.interfaceViewValue.amount),
                        new Decimal(0)
                    )

                    return this.transfer.create({
                        sender: params.partyId,
                        recipient: params.partyId,
                        amount: accumulatedAmount.toString(),
                        instrumentId: instrumentId,
                        registryUrl, //change to url,
                        inputUtxos: inputUtxos.map((h) => h.contractId),
                        memo: params.memo ?? 'merge-utxos',
                    })
                }
            )
            const transferResults = await Promise.all(transferPromises)
            allTransferResults.push(...transferResults)
        }

        const commands = allTransferResults.map(([cmd]) => cmd)
        const disclosedContracts = Array.from(
            new Map(
                allTransferResults
                    .flatMap(([, dc]) => dc)
                    .map((dc) => [dc.contractId, dc])
            ).values()
        )

        return [commands, disclosedContracts]
    }

    /**
     * Lists all holding UTXOs for the current party.
     * @param partyId
     * @returns  A promise that resolves to an array of holding UTXOs.
     */
    async list(params: ListHoldingsParams) {
        const {
            partyId,
            includeLocked,
            limit,
            offset,
            continueUntilCompletion,
        } = params
        const utxos =
            await this.sdkContext.tokenStandardService.listContractsByInterface<Holding>(
                HOLDING_INTERFACE_ID,
                partyId,
                limit,
                offset,
                continueUntilCompletion
            )

        const currentTime = new Date()

        const filteredUtxos = includeLocked
            ? utxos
            : utxos.filter(
                  (utxo) =>
                      !TokenStandardService.isHoldingLocked(
                          utxo.interfaceViewValue,
                          currentTime
                      )
              )

        return filteredUtxos
    }

    async createBatchMergeUtility(synchronizerId: string = '') {
        const commands = [
            {
                CreateCommand: {
                    templateId:
                        '#splice-util-token-standard-wallet:Splice.Util.Token.Wallet.MergeDelegation:BatchMergeUtility',
                    createArguments: {
                        operator: this.sdkContext.validator.party,
                    },
                },
            },
        ]

        return await this.sdkContext.validator.internal.submit({
            commands,
            synchronizerId,
        })
    }

    async approveMergeDelegationProposal(args: {
        owner: PartyId
        synchronizerId?: string
    }) {
        const { owner, synchronizerId = '' } = args
        const mergeDelegationProposals = await this.ledger.listACS({
            body: {
                filter: TransactionFilterBySetup({
                    partyId: owner,
                    templateIds: [
                        '#splice-util-token-standard-wallet:Splice.Util.Token.Wallet.MergeDelegation:MergeDelegationProposal',
                    ],
                }),
            },
        })

        const mergeDelegationProposal = mergeDelegationProposals[0]

        if (!mergeDelegationProposal) {
            this.sdkContext.error.throw({
                message: 'Not an active contract',
                type: 'NotFound',
            })
        }

        const disclosedContracts = [
            activeContractToDisclosedContract(mergeDelegationProposal),
        ]

        const exercise = {
            templateId:
                '#splice-util-token-standard-wallet:Splice.Util.Token.Wallet.MergeDelegation:MergeDelegationProposal',
            contractId: mergeDelegationProposal.contractId,
            choice: 'MergeDelegationProposal_Accept',
            choiceArgument: {},
        }

        return await this.sdkContext.validator.internal.submit({
            commands: [{ ExerciseCommand: exercise }],
            disclosedContracts,
            synchronizerId,
        })
    }

    async useMergeDelegations(args: {
        party: PartyId
        synchronizerId?: string
        nodeLimit?: number
        inputUtxos?: PrettyContract<Holding>[]
    }) {
        const { party, nodeLimit = 200, inputUtxos, synchronizerId = '' } = args

        const utxos =
            inputUtxos ??
            (await this.list({
                partyId: party,
                limit: nodeLimit,
            }))

        if (utxos.length < 10) {
            this.sdkContext.error.throw({
                message: `Utxos are less than 10, found ${utxos.length}`,
                type: 'SDKOperationUnsupported',
            })
        }

        const allMergeDelegationChoices: WrappedCommand<'ExerciseCommand'>[] =
            []

        const mergeDelegationContractsForUser = await this.ledger.listACS({
            body: {
                filter: TransactionFilterBySetup({
                    partyId: party,
                    templateIds: [
                        '#splice-util-token-standard-wallet:Splice.Util.Token.Wallet.MergeDelegation:MergeDelegation',
                    ],
                }),
            },
        })

        const mergeDelegationDc = activeContractToDisclosedContract(
            mergeDelegationContractsForUser[0]
        )

        const batchMergeUtilityContracts = await this.ledger.listACS({
            body: {
                filter: TransactionFilterBySetup({
                    partyId: this.sdkContext.validator.party,
                    templateIds: [
                        '#splice-util-token-standard-wallet:Splice.Util.Token.Wallet.MergeDelegation:BatchMergeUtility',
                    ],
                }),
            },
        })

        const batchDelegationDc = activeContractToDisclosedContract(
            batchMergeUtilityContracts[0]
        )

        const disclosedContractsFromInputUtxos: DisclosedContract[] = utxos
            .map((u) => ({
                ...u.activeContract.createdEvent,
                synchronizerId: u.activeContract.synchronizerId,
            }))
            .map(activeContractToDisclosedContract)

        const disclosedContracts: DisclosedContract[] = [
            mergeDelegationDc,
            batchDelegationDc,
            ...disclosedContractsFromInputUtxos,
        ]

        const [transferCommands, transferCommandDc] = await this.merge({
            partyId: party,
            ...(inputUtxos && { inputUtxos }),
            nodeLimit,
        })

        disclosedContracts.push(...transferCommandDc)

        const uniqueDisclosedContracts = Array.from(
            new Map(disclosedContracts.map((c) => [c.contractId, c])).values()
        )

        transferCommands.map((tc) => {
            const exercise: ExerciseCommand = {
                templateId:
                    '#splice-util-token-standard-wallet:Splice.Util.Token.Wallet.MergeDelegation:MergeDelegation',
                contractId: mergeDelegationDc.contractId,
                choice: 'MergeDelegation_Merge',
                choiceArgument: {
                    optMergeTransfer: {
                        factoryCid: tc.ExerciseCommand.contractId,
                        choiceArg: tc.ExerciseCommand.choiceArgument,
                    },
                },
            }

            allMergeDelegationChoices.push({
                ExerciseCommand: exercise,
            })
        })

        const mergeCallInput = allMergeDelegationChoices.map((c) => {
            return {
                delegationCid: c.ExerciseCommand.contractId,
                choiceArg: c.ExerciseCommand.choiceArgument,
            }
        })

        const batchExerciseCommand: ExerciseCommand = {
            templateId:
                '#splice-util-token-standard-wallet:Splice.Util.Token.Wallet.MergeDelegation:BatchMergeUtility',
            contractId: batchDelegationDc.contractId,
            choice: 'BatchMergeUtility_BatchMerge',
            choiceArgument: {
                mergeCalls: mergeCallInput,
            },
        }

        return await this.sdkContext.validator.internal.submit({
            commands: [{ ExerciseCommand: batchExerciseCommand }],
            synchronizerId,
            disclosedContracts: uniqueDisclosedContracts,
        })
    }

    get command() {
        return {
            createMergeDelegationProposal: (args: {
                owner: PartyId
                metadata?: Metadata
            }) => {
                const { owner, metadata = { values: {} } } = args
                return {
                    CreateCommand: {
                        templateId:
                            '#splice-util-token-standard-wallet:Splice.Util.Token.Wallet.MergeDelegation:MergeDelegationProposal',
                        createArguments: {
                            delegation: {
                                operator: this.sdkContext.validator.party,
                                owner,
                                meta: metadata,
                            },
                        },
                    },
                }
            },
        }
    }
}

function activeContractToDisclosedContract(
    data: Awaited<ReturnType<Ledger['listACS']>>[number]
) {
    return {
        templateId: data.templateId,
        contractId: data.contractId,
        createdEventBlob: data.createdEventBlob,
        synchronizerId: data.synchronizerId,
    }
}
