import {
    signTransactionHash,
    type SDKInterface,
} from '@canton-network/wallet-sdk'
import type { KeyPair } from '@canton-network/core-signing-lib'

export type MultiPartySubmitParams = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    commands: any[]
    actAs: string[]
    readAs?: string[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    disclosedContracts?: any[]
    synchronizerId?: string
    signers: Array<{ partyId: string; keyPair: KeyPair }>
}

/**
 * Multi-party prepare, sign, and execute.
 *
 * Prepares a transaction via the SDK's internal prepare endpoint,
 * collects signatures from all listed signers, then submits via
 * the raw executeAndWait endpoint.
 */
export async function multiPartySubmit(
    sdk: SDKInterface,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ledgerProvider: any,
    userId: string,
    params: MultiPartySubmitParams
): Promise<void> {
    const prepareResult = await sdk.ledger.internal.prepare({
        commands: params.commands,
        actAs: params.actAs,
        readAs: params.readAs ?? [],
        disclosedContracts: params.disclosedContracts ?? [],
        ...(params.synchronizerId
            ? { synchronizerId: params.synchronizerId }
            : {}),
    })

    const txHash = prepareResult.preparedTransactionHash
    if (!txHash) throw new Error('Prepare returned no transaction hash')

    const partySignatures = params.signers.map(({ partyId, keyPair }) => ({
        party: partyId,
        signatures: [
            {
                signature: signTransactionHash(txHash, keyPair.privateKey),
                signedBy: partyId.split('::')[1],
                format: 'SIGNATURE_FORMAT_CONCAT',
                signingAlgorithmSpec: 'SIGNING_ALGORITHM_SPEC_ED25519',
            },
        ],
    }))

    await ledgerProvider.request({
        method: 'ledgerApi',
        params: {
            resource: '/v2/interactive-submission/executeAndWait',
            requestMethod: 'post',
            body: {
                userId,
                preparedTransaction: prepareResult.preparedTransaction,
                hashingSchemeVersion: 'HASHING_SCHEME_VERSION_V2',
                submissionId: crypto.randomUUID(),
                deduplicationPeriod: { Empty: {} },
                partySignatures: { signatures: partySignatures },
            },
        },
    })
}
