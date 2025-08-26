import { LedgerClient } from './LedgerClient'
import { TransferInstructionInterface } from './constants'
import { components } from './generated-clients/openapi-3.3.0-SNAPSHOT.js'
import { submitExerciseCommand } from './ledger-api-utils'

type ExerciseCommand = components['schemas']['ExerciseCommand']

interface AcceptTransferInstructionCommandOptions {
    // paths to keys
    publicKey: string
    privateKey: string
    transferFactoryRegistryUrl: string
    party: string
    userId: string
}

export class TokenStandardService {
    constructor(private ledgerClient: LedgerClient) {}

    async acceptTransferInstruction(
        transferInstructionCid: string,
        opts: AcceptTransferInstructionCommandOptions
    ): Promise<void> {
        try {
            const {
                privateKey,
                publicKey,
                party,
                userId,
                transferFactoryRegistryUrl,
            } = opts
            const transferRegistryConfig = createConfiguration({
                baseServer: new ServerConfiguration(
                    transferFactoryRegistryUrl,
                    {}
                ),
            })
            const transferRegistryClient = new TransferFactoryAPI(
                transferRegistryConfig
            )

            const choiceContext =
                await transferRegistryClient.getTransferInstructionAcceptContext(
                    transferInstructionCid,
                    {}
                )

            const exercise: ExerciseCommand = {
                templateId: TransferInstructionInterface.toString(),
                contractId: transferInstructionCid,
                choice: 'TransferInstruction_Accept',
                choiceArgument: {
                    extraArgs: {
                        context: choiceContext.choiceContextData,
                        meta: { values: {} },
                    },
                },
            }

            const completion = await submitExerciseCommand(
                this.ledgerClient,
                exercise,
                choiceContext.disclosedContracts,
                party,
                userId,
                publicKey,
                privateKey
            )
            const result = { ...completion, status: 'success' }

            console.log(JSON.stringify(result, null, 2))
        } catch (e) {
            console.error('Failed to accept transfer instruction:', e)
        }
    }
}
