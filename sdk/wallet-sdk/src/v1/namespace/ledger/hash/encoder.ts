// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    Create,
    DamlTransaction,
    DamlTransaction_Node,
    DamlTransaction_NodeSeed,
    Exercise,
    Fetch,
    GenMap_Entry,
    HashingSchemeVersion,
    Identifier,
    Metadata,
    Metadata_InputContract,
    RecordField,
    Rollback,
    TextMap_Entry,
    Value,
} from '@canton-network/core-ledger-proto'

const NODE_ENCODING_VERSION = Uint8Array.from([0x01])

async function encodeBool(value: boolean): Promise<Uint8Array> {
    return new Uint8Array([value ? 1 : 0])
}

function encodeInt(bit: '32', value: number): Promise<Uint8Array>
function encodeInt(bit: '64', value: bigint | number): Promise<Uint8Array>
async function encodeInt(
    bit: '32' | '64',
    value: bigint | number
): Promise<Uint8Array> {
    const num = BigInt(value)
    const binNum = +bit
    const buffer = new ArrayBuffer(binNum / 8)
    const view = new DataView(buffer)
    if (bit === '32') view.setInt32(0, value as number, false)
    else view.setBigInt64(0, num, false)
    return new Uint8Array(buffer)
}

export async function encodeString(value: string = ''): Promise<Uint8Array> {
    const utf8Bytes = new TextEncoder().encode(value)
    return encodeBytes(utf8Bytes)
}

async function encodeBytes(value: Uint8Array): Promise<Uint8Array> {
    const length = await encodeInt('32', value.length)
    return Encoder.concatBytes(length, value)
}

function encodeHexString(value: string = ''): Promise<Uint8Array> {
    // Convert hex string to Uint8Array
    const bytes = new Uint8Array(value.length / 2)
    for (let i = 0; i < value.length; i += 2) {
        bytes[i / 2] = parseInt(value.slice(i, i + 2), 16)
    }
    return encodeBytes(bytes)
}

async function encodeOptional<T>(
    value: T | undefined | null,
    encodeFn: (arg: T) => Promise<Uint8Array>
): Promise<Uint8Array> {
    if (value === undefined || value === null) {
        return new Uint8Array([0]) // Return empty array for undefined fields
    } else {
        return Encoder.concatBytes(1, await encodeFn(value))
    }
}

async function encodeRepeated<T>(
    values: T[] = [],
    encodeFn: (value: T) => Promise<Uint8Array>
): Promise<Uint8Array> {
    const length = await encodeInt('32', values.length)
    const encodedValues = await Promise.all(values.map(encodeFn))
    return Encoder.concatBytes(length, ...encodedValues)
}

function findSeed(
    nodeId: string,
    nodeSeeds: DamlTransaction_NodeSeed[]
): Uint8Array | undefined {
    const seed = nodeSeeds.find(
        (seed) => seed.nodeId.toString() === nodeId
    )?.seed

    return seed
}

async function encodeIdentifier(identifier: Identifier): Promise<Uint8Array> {
    return Encoder.concatBytes(
        await encodeString(identifier.packageId),
        await encodeRepeated(identifier.moduleName.split('.'), encodeString),
        await encodeRepeated(identifier.entityName.split('.'), encodeString)
    )
}

async function encodeTextMapEntry(entry: TextMap_Entry): Promise<Uint8Array> {
    return Encoder.concatBytes(
        await encodeString(entry.key),
        await encodeValue(entry.value!)
    )
}

async function encodeRecordField(field: RecordField): Promise<Uint8Array> {
    return Encoder.concatBytes(
        await encodeOptional(field.label, encodeString),
        await encodeValue(field.value!)
    )
}

async function encodeGenMapEntry(entry: GenMap_Entry): Promise<Uint8Array> {
    return Encoder.concatBytes(
        await encodeValue(entry.key!),
        await encodeValue(entry.value!)
    )
}

async function encodeValue(value: Value): Promise<Uint8Array> {
    if (value.sum.oneofKind === 'unit') {
        return Uint8Array.from([0]) // Unit value
    } else if (value.sum.oneofKind === 'bool') {
        return Encoder.concatBytes(
            Uint8Array.from([0x01]),
            await encodeBool(value.sum.bool)
        )
    } else if (value.sum.oneofKind === 'int64') {
        return Encoder.concatBytes(
            Uint8Array.from([0x02]),
            await encodeInt('64', parseInt(value.sum.int64))
        )
    } else if (value.sum.oneofKind === 'numeric') {
        return Encoder.concatBytes(
            Uint8Array.from([0x03]),
            await encodeString(value.sum.numeric)
        )
    } else if (value.sum.oneofKind === 'timestamp') {
        return Encoder.concatBytes(
            Uint8Array.from([0x04]),
            await encodeInt('64', BigInt(value.sum.timestamp))
        )
    } else if (value.sum.oneofKind === 'date') {
        return Encoder.concatBytes(
            Uint8Array.from([0x05]),
            await encodeInt('32', value.sum.date)
        )
    } else if (value.sum.oneofKind === 'party') {
        return Encoder.concatBytes(
            Uint8Array.from([0x06]),
            await encodeString(value.sum.party)
        )
    } else if (value.sum.oneofKind === 'text') {
        return Encoder.concatBytes(
            Uint8Array.from([0x07]),
            await encodeString(value.sum.text)
        )
    } else if (value.sum.oneofKind === 'contractId') {
        return Encoder.concatBytes(
            Uint8Array.from([0x08]),
            await encodeHexString(value.sum.contractId)
        )
    } else if (value.sum.oneofKind === 'optional') {
        return Encoder.concatBytes(
            Uint8Array.from([0x09]),
            await encodeOptional(value.sum.optional.value, encodeValue)
        )
    } else if (value.sum.oneofKind === 'list') {
        return Encoder.concatBytes(
            Uint8Array.from([0x0a]),
            await encodeRepeated(value.sum.list.elements, encodeValue)
        )
    } else if (value.sum.oneofKind === 'textMap') {
        return Encoder.concatBytes(
            Uint8Array.from([0x0b]),
            await encodeRepeated(value.sum.textMap?.entries, encodeTextMapEntry)
        )
    } else if (value.sum.oneofKind === 'record') {
        return Encoder.concatBytes(
            Uint8Array.from([0x0c]),
            await encodeOptional(value.sum.record.recordId, encodeIdentifier),
            await encodeRepeated(value.sum.record.fields, encodeRecordField)
        )
    } else if (value.sum.oneofKind === 'variant') {
        return Encoder.concatBytes(
            Uint8Array.from([0x0d]),
            await encodeOptional(value.sum.variant.variantId, encodeIdentifier),
            await encodeString(value.sum.variant.constructor),
            await encodeValue(value.sum.variant.value!)
        )
    } else if (value.sum.oneofKind === 'enum') {
        return Encoder.concatBytes(
            Uint8Array.from([0x0e]),
            await encodeOptional(value.sum.enum.enumId, encodeIdentifier),
            await encodeString(value.sum.enum.constructor)
        )
    } else if (value.sum.oneofKind === 'genMap') {
        return Encoder.concatBytes(
            Uint8Array.from([0x0f]),
            await encodeRepeated(value.sum.genMap?.entries, encodeGenMapEntry)
        )
    }

    throw new Error('Unsupported value type: ' + JSON.stringify(value))
}

async function encodeCreateNode(
    create: Create | undefined,
    nodeId: string,
    nodeSeeds: DamlTransaction_NodeSeed[]
): Promise<Uint8Array> {
    return create
        ? Encoder.concatBytes(
              NODE_ENCODING_VERSION,
              await encodeString(create.lfVersion),
              0 /** Create node tag */,
              await encodeOptional(
                  findSeed(nodeId, nodeSeeds),
                  async (val) => val
              ),
              await encodeHexString(create.contractId),
              await encodeString(create.packageName),
              await encodeIdentifier(create.templateId!),
              await encodeValue(create.argument!),
              await encodeRepeated(create.signatories, encodeString),
              await encodeRepeated(create.stakeholders, encodeString)
          )
        : Encoder.concatBytes()
}

async function encodeInputContract(contract: Metadata_InputContract) {
    if (contract.contract.oneofKind === 'v1')
        return Encoder.concatBytes(
            await encodeInt('64', contract.createdAt),
            await Encoder.sha256(
                await encodeCreateNode(
                    contract.contract.v1,
                    'unused_node_id',
                    []
                )
            )
        )
    else throw new Error('Unsupported contract version')
}

async function encodeExerciseNode(
    exercise: Exercise,
    nodeId: string,
    nodesDict: Record<string, DamlTransaction_Node>,
    nodeSeeds: DamlTransaction_NodeSeed[]
): Promise<Uint8Array> {
    return Encoder.concatBytes(
        NODE_ENCODING_VERSION,
        await encodeString(exercise.lfVersion),
        1 /** Exercise node tag */,
        findSeed(nodeId, nodeSeeds)!,
        await encodeHexString(exercise.contractId),
        await encodeString(exercise.packageName),
        await encodeIdentifier(exercise.templateId!),
        await encodeRepeated(exercise.signatories, encodeString),
        await encodeRepeated(exercise.stakeholders, encodeString),
        await encodeRepeated(exercise.actingParties, encodeString),
        await encodeOptional(exercise.interfaceId, encodeIdentifier),
        await encodeString(exercise.choiceId),
        await encodeValue(exercise.chosenValue!),
        await encodeBool(exercise.consuming),
        await encodeOptional(exercise.exerciseResult, encodeValue),
        await encodeRepeated(exercise.choiceObservers, encodeString),
        await encodeRepeated(
            exercise.children,
            encodeNodeId(nodesDict, nodeSeeds)
        )
    )
}

async function encodeFetchNode(fetch: Fetch): Promise<Uint8Array> {
    return Encoder.concatBytes(
        NODE_ENCODING_VERSION,
        await encodeString(fetch.lfVersion),
        2 /** Fetch node tag */,
        await encodeHexString(fetch.contractId),
        await encodeString(fetch.packageName),
        await encodeIdentifier(fetch.templateId!),
        await encodeRepeated(fetch.signatories, encodeString),
        await encodeRepeated(fetch.stakeholders, encodeString),
        await encodeOptional(fetch.interfaceId, encodeIdentifier),
        await encodeRepeated(fetch.actingParties, encodeString)
    )
}

async function encodeRollbackNode(
    rollback: Rollback,
    nodesDict: Record<string, DamlTransaction_Node>,
    nodeSeeds: DamlTransaction_NodeSeed[]
): Promise<Uint8Array> {
    return Encoder.concatBytes(
        NODE_ENCODING_VERSION,
        3 /** Rollback node tag */,
        await encodeRepeated(
            rollback.children,
            encodeNodeId(nodesDict, nodeSeeds)
        )
    )
}

async function encodeNode(
    node: DamlTransaction_Node,
    nodesDict: Record<string, DamlTransaction_Node>,
    nodeSeeds: DamlTransaction_NodeSeed[]
): Promise<Uint8Array> {
    if (node.versionedNode.oneofKind === 'v1') {
        if (node.versionedNode.v1.nodeType.oneofKind === 'create') {
            return encodeCreateNode(
                node.versionedNode.v1.nodeType.create,
                node.nodeId,
                nodeSeeds
            )
        } else if (node.versionedNode.v1.nodeType.oneofKind === 'exercise') {
            return encodeExerciseNode(
                node.versionedNode.v1.nodeType.exercise,
                node.nodeId,
                nodesDict,
                nodeSeeds
            )
        } else if (node.versionedNode.v1.nodeType.oneofKind === 'fetch') {
            return encodeFetchNode(node.versionedNode.v1.nodeType.fetch)
        } else if (node.versionedNode.v1.nodeType.oneofKind === 'rollback') {
            return encodeRollbackNode(
                node.versionedNode.v1.nodeType.rollback,
                nodesDict,
                nodeSeeds
            )
        }

        throw new Error('Unsupported node type')
    } else {
        throw new Error(`Unsupported node version`)
    }
}

function encodeNodeId(
    nodesDict: Record<string, DamlTransaction_Node>,
    nodeSeeds: DamlTransaction_NodeSeed[]
): (nodeId: string) => Promise<Uint8Array> {
    return async (nodeId: string): Promise<Uint8Array> => {
        const node = nodesDict[nodeId]
        if (!node) {
            throw new Error(`Node with ID ${nodeId} not found in transaction`)
        }

        const encodedNode = await encodeNode(node, nodesDict, nodeSeeds)
        return Encoder.sha256(encodedNode)
    }
}

export class Encoder {
    static readonly hashingSchemeVersion = Uint8Array.from([
        HashingSchemeVersion.V2,
    ])

    static readonly preparedTransactionHashPurpose = Uint8Array.from([
        0x00, 0x00, 0x00, 0x30,
    ])

    static async sha256(message: string | Uint8Array) {
        const msg =
            typeof message === 'string'
                ? new TextEncoder().encode(message)
                : message

        return crypto.subtle
            .digest('SHA-256', new Uint8Array(msg))
            .then((hash) => new Uint8Array(hash))
    }

    static concatBytes(...args: (number | Uint8Array)[]): Uint8Array {
        const normalizedArgs: Uint8Array[] = args.map((arg) => {
            if (typeof arg === 'number') {
                return new Uint8Array([arg])
            } else {
                return arg
            }
        })

        let totalLength = 0
        normalizedArgs.forEach((arg) => {
            totalLength += arg.length
        })

        const mergedArray = new Uint8Array(totalLength)
        let offset = 0

        normalizedArgs.forEach((arg) => {
            mergedArray.set(arg, offset)
            offset += arg.length
        })

        return mergedArray
    }

    static async encodeMetadata(metadata: Metadata) {
        return Encoder.concatBytes(
            Uint8Array.from([0x01]),
            await encodeRepeated(metadata.submitterInfo?.actAs, encodeString),
            await encodeString(metadata.submitterInfo?.commandId),
            await encodeString(metadata.transactionUuid),
            await encodeInt('32', metadata.mediatorGroup),
            await encodeString(metadata.synchronizerId),
            await encodeOptional(metadata.minLedgerEffectiveTime, (v) =>
                encodeInt('64', v)
            ),
            await encodeOptional(metadata.maxLedgerEffectiveTime, (v) =>
                encodeInt('64', v)
            ),
            await encodeInt('64', metadata.preparationTime),
            await encodeRepeated(metadata.inputContracts, encodeInputContract)
        )
    }

    static async encodeTransaction(
        transaction: DamlTransaction,
        nodesDict: Record<string, DamlTransaction_Node>,
        nodeSeeds: DamlTransaction_NodeSeed[]
    ): Promise<Uint8Array> {
        return Encoder.concatBytes(
            await encodeString(transaction.version),
            await encodeRepeated(
                transaction.roots,
                encodeNodeId(nodesDict, nodeSeeds)
            )
        )
    }
}
