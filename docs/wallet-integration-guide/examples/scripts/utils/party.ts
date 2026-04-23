import { signTransactionHash } from '@canton-network/wallet-sdk'
import type { KeyPair } from '@canton-network/core-signing-lib'
import type { GenerateTransactionResponse } from '@canton-network/core-ledger-client'

export type PartyInfo = Omit<
    GenerateTransactionResponse,
    'topologyTransactions'
> & {
    topologyTransactions?: string[] | undefined
    keyPair: KeyPair
}

/**
 * Register a party on a non-default synchronizer.
 *
 * Generates topology transactions for the given synchronizer,
 * signs the multi-hash, and calls allocate to complete the
 * registration.
 */
export async function registerPartyOnSynchronizer(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ledgerProvider: any,
    info: PartyInfo,
    synchronizerId: string
): Promise<void> {
    const topoResponse = await ledgerProvider.request({
        method: 'ledgerApi',
        params: {
            resource: '/v2/parties/external/generate-topology',
            requestMethod: 'post',
            body: {
                synchronizer: synchronizerId,
                partyHint: info.partyId.split('::')[0],
                publicKey: {
                    format: 'CRYPTO_KEY_FORMAT_RAW',
                    keyData: info.keyPair.publicKey,
                    keySpec: 'SIGNING_KEY_SPEC_EC_CURVE25519',
                },
                localParticipantObservationOnly: false,
                confirmationThreshold: 1,
                otherConfirmingParticipantUids: [],
                observingParticipantUids: [],
            },
        },
    })

    const topoSignature = signTransactionHash(
        topoResponse.multiHash,
        info.keyPair.privateKey
    )

    await ledgerProvider.request({
        method: 'ledgerApi',
        params: {
            resource: '/v2/parties/external/allocate',
            requestMethod: 'post',
            body: {
                synchronizer: synchronizerId,
                identityProviderId: '',
                onboardingTransactions: topoResponse.topologyTransactions.map(
                    (transaction: string) => ({ transaction })
                ),
                multiHashSignatures: [
                    {
                        format: 'SIGNATURE_FORMAT_CONCAT',
                        signature: topoSignature,
                        signedBy: info.publicKeyFingerprint,
                        signingAlgorithmSpec: 'SIGNING_ALGORITHM_SPEC_ED25519',
                    },
                ],
            },
        },
    })
}
