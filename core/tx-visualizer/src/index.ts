import { PreparedTransaction } from 'core-ledger-client'
import { computePreparedTransaction } from './hashing_scheme_v2'
import { fromBase64, toBase64, toHex } from './utils'

/**
 * Decodes a base64 encoded prepared transaction into a well-typed data model, generated directly from Protobuf definitions.
 *
 * @param preparedTransaction - The prepared transaction in base64 format
 * @returns The decoded prepared transaction
 */
export const decodePreparedTransaction = (
    preparedTransaction: string
): PreparedTransaction => {
    const bytes = fromBase64(preparedTransaction)
    return PreparedTransaction.fromBinary(bytes)
}

/**
 * Computes the hash of a prepared transaction.
 *
 * @param preparedTransaction - The prepared transaction to hash
 * @param format - The format of the output hash (base64 or hex)
 * @returns The computed hash in the specified format
 */
export const hashPreparedTransaction = async (
    preparedTransaction: string | PreparedTransaction,
    format: 'base64' | 'hex' = 'base64'
): Promise<string> => {
    let preparedTx: PreparedTransaction

    if (typeof preparedTransaction === 'string') {
        preparedTx = decodePreparedTransaction(preparedTransaction)
    } else {
        preparedTx = preparedTransaction
    }

    const hash = await computePreparedTransaction(preparedTx)

    switch (format) {
        case 'base64':
            return toBase64(hash)
        case 'hex':
            return toHex(hash)
    }
}

type ValidationResult = Record<
    string,
    {
        isAuthorized: boolean
        locations: string[]
    }
>

export const validateAuthorizedPartyIds = (
    preparedTransaction: string | PreparedTransaction,
    authorizedPartyIds: string[]
): ValidationResult => {
    let preparedTx: PreparedTransaction

    if (typeof preparedTransaction === 'string') {
        preparedTx = decodePreparedTransaction(preparedTransaction)
    } else {
        preparedTx = preparedTransaction
    }

    const results: ValidationResult = {}
    preparedTx.metadata?.submitterInfo?.actAs.forEach((party) => {
        results[party] = {
            isAuthorized: authorizedPartyIds.includes(party),
            locations: [
                ...results[party].locations,
                'metadata.submitterInfo.actAs',
            ],
        }
    })

    // then check transaction nodes
    preparedTx.transaction?.nodes.forEach((node) => {
        if (node.versionedNode.oneofKind === 'v1') {
            if (node.versionedNode.v1.nodeType.oneofKind === 'create') {
                node.versionedNode.v1.nodeType.create.signatories.forEach(
                    (party) => {
                        results[party] = {
                            isAuthorized: authorizedPartyIds.includes(party),
                            locations: [
                                ...results[party].locations,
                                `transaction.nodes.${node.nodeId}.create.signatories`,
                            ],
                        }
                    }
                )

                node.versionedNode.v1.nodeType.create.stakeholders.forEach(
                    (party) => {
                        results[party] = {
                            isAuthorized: authorizedPartyIds.includes(party),
                            locations: [
                                ...results[party].locations,
                                `transaction.nodes.${node.nodeId}.create.stakeholders`,
                            ],
                        }
                    }
                )
            }

            if (node.versionedNode.v1.nodeType.oneofKind === 'exercise') {
                throw new Error('Unsupported')
            }

            if (node.versionedNode.v1.nodeType.oneofKind === 'fetch') {
                throw new Error('Unsupported')
            }

            if (node.versionedNode.v1.nodeType.oneofKind === 'rollback') {
                // do we need to check these nodes?
            }
        }
    })

    return results
}
