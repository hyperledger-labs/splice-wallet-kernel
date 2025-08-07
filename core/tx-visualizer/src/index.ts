import { PreparedTransaction } from './_gen/com/daml/ledger/api/v2/interactive/interactive_submission_service'
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
    return PreparedTransaction.decode(fromBase64(preparedTransaction))
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

    // first check metadata
    //   results = { ...results, checkPartyList(results, preparedTx.metadata?.submitterInfo?.actAs || [], authorizedPartyIds, "metadata.submitterInfo.actAs")};
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
        if (node.v1?.create) {
            node.v1.create.signatories.forEach((party) => {
                results[party] = {
                    isAuthorized: authorizedPartyIds.includes(party),
                    locations: [
                        ...results[party].locations,
                        `transaction.nodes.${node.nodeId}.create.signatories`,
                    ],
                }
            })

            node.v1.create.stakeholders.forEach((party) => {
                results[party] = {
                    isAuthorized: authorizedPartyIds.includes(party),
                    locations: [
                        ...results[party].locations,
                        `transaction.nodes.${node.nodeId}.create.stakeholders`,
                    ],
                }
            })
        }

        if (node.v1?.exercise) {
            throw new Error('Unsupported')
        }

        if (node.v1?.fetch) {
            throw new Error('Unsupported')
        }

        if (node.v1?.rollback) {
            // do we need to check these nodes?
        }
    })

    return results
}
