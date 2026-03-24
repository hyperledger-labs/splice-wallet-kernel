// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    Create,
    DamlTransaction_Node,
    DamlTransaction_NodeSeed,
    Exercise,
    Fetch,
    GenMap_Entry,
    Identifier,
    Metadata_InputContract,
    RecordField,
    Rollback,
    TextMap_Entry,
} from '@canton-network/core-ledger-proto'
import { Encoder } from './client'
import { NODE_ENCODING_VERSION } from './const'
import { PrimitiveEncoder } from './primitiveEncoder'

export class DamlEntityEncoder {
    static async encodeExerciseNode(
        exercise: Exercise,
        nodeId: string,
        nodesDict: Record<string, DamlTransaction_Node>,
        nodeSeeds: DamlTransaction_NodeSeed[]
    ): Promise<Uint8Array> {
        return Encoder.concatBytes(
            NODE_ENCODING_VERSION,
            await PrimitiveEncoder.encodeString(exercise.lfVersion),
            1 /** Exercise node tag */,
            PrimitiveEncoder.findSeed(nodeId, nodeSeeds)!,
            await PrimitiveEncoder.encodeHexString(exercise.contractId),
            await PrimitiveEncoder.encodeString(exercise.packageName),
            await this.encodeIdentifier(exercise.templateId!),
            await PrimitiveEncoder.encodeRepeated(
                exercise.signatories,
                PrimitiveEncoder.encodeString
            ),
            await PrimitiveEncoder.encodeRepeated(
                exercise.stakeholders,
                PrimitiveEncoder.encodeString
            ),
            await PrimitiveEncoder.encodeRepeated(
                exercise.actingParties,
                PrimitiveEncoder.encodeString
            ),
            await PrimitiveEncoder.encodeOptional(
                exercise.interfaceId,
                this.encodeIdentifier
            ),
            await PrimitiveEncoder.encodeString(exercise.choiceId),
            await PrimitiveEncoder.encodeValue(exercise.chosenValue!),
            await PrimitiveEncoder.encodeBool(exercise.consuming),
            await PrimitiveEncoder.encodeOptional(
                exercise.exerciseResult,
                PrimitiveEncoder.encodeValue
            ),
            await PrimitiveEncoder.encodeRepeated(
                exercise.choiceObservers,
                PrimitiveEncoder.encodeString
            ),
            await PrimitiveEncoder.encodeRepeated(
                exercise.children,
                this.encodeNodeId(nodesDict, nodeSeeds)
            )
        )
    }

    static async encodeFetchNode(fetch: Fetch): Promise<Uint8Array> {
        return Encoder.concatBytes(
            NODE_ENCODING_VERSION,
            await PrimitiveEncoder.encodeString(fetch.lfVersion),
            2 /** Fetch node tag */,
            await PrimitiveEncoder.encodeHexString(fetch.contractId),
            await PrimitiveEncoder.encodeString(fetch.packageName),
            await this.encodeIdentifier(fetch.templateId!),
            await PrimitiveEncoder.encodeRepeated(
                fetch.signatories,
                PrimitiveEncoder.encodeString
            ),
            await PrimitiveEncoder.encodeRepeated(
                fetch.stakeholders,
                PrimitiveEncoder.encodeString
            ),
            await PrimitiveEncoder.encodeOptional(
                fetch.interfaceId,
                this.encodeIdentifier
            ),
            await PrimitiveEncoder.encodeRepeated(
                fetch.actingParties,
                PrimitiveEncoder.encodeString
            )
        )
    }

    static async encodeCreateNode(
        create: Create | undefined,
        nodeId: string,
        nodeSeeds: DamlTransaction_NodeSeed[]
    ): Promise<Uint8Array> {
        return create
            ? Encoder.concatBytes(
                  NODE_ENCODING_VERSION,
                  await PrimitiveEncoder.encodeString(create.lfVersion),
                  0 /** Create node tag */,
                  await PrimitiveEncoder.encodeOptional(
                      PrimitiveEncoder.findSeed(nodeId, nodeSeeds),
                      async (val) => val
                  ),
                  await PrimitiveEncoder.encodeHexString(create.contractId),
                  await PrimitiveEncoder.encodeString(create.packageName),
                  await this.encodeIdentifier(create.templateId!),
                  await PrimitiveEncoder.encodeValue(create.argument!),
                  await PrimitiveEncoder.encodeRepeated(
                      create.signatories,
                      PrimitiveEncoder.encodeString
                  ),
                  await PrimitiveEncoder.encodeRepeated(
                      create.stakeholders,
                      PrimitiveEncoder.encodeString
                  )
              )
            : Encoder.concatBytes()
    }

    static async encodeRollbackNode(
        rollback: Rollback,
        nodesDict: Record<string, DamlTransaction_Node>,
        nodeSeeds: DamlTransaction_NodeSeed[]
    ): Promise<Uint8Array> {
        return Encoder.concatBytes(
            NODE_ENCODING_VERSION,
            3 /** Rollback node tag */,
            await PrimitiveEncoder.encodeRepeated(
                rollback.children,
                this.encodeNodeId(nodesDict, nodeSeeds)
            )
        )
    }

    static async encodeNode(
        node: DamlTransaction_Node,
        nodesDict: Record<string, DamlTransaction_Node>,
        nodeSeeds: DamlTransaction_NodeSeed[]
    ): Promise<Uint8Array> {
        if (node.versionedNode.oneofKind === 'v1') {
            if (node.versionedNode.v1.nodeType.oneofKind === 'create') {
                return this.encodeCreateNode(
                    node.versionedNode.v1.nodeType.create,
                    node.nodeId,
                    nodeSeeds
                )
            } else if (
                node.versionedNode.v1.nodeType.oneofKind === 'exercise'
            ) {
                return this.encodeExerciseNode(
                    node.versionedNode.v1.nodeType.exercise,
                    node.nodeId,
                    nodesDict,
                    nodeSeeds
                )
            } else if (node.versionedNode.v1.nodeType.oneofKind === 'fetch') {
                return this.encodeFetchNode(
                    node.versionedNode.v1.nodeType.fetch
                )
            } else if (
                node.versionedNode.v1.nodeType.oneofKind === 'rollback'
            ) {
                return this.encodeRollbackNode(
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

    static async encodeIdentifier(identifier: Identifier): Promise<Uint8Array> {
        return Encoder.concatBytes(
            await PrimitiveEncoder.encodeString(identifier.packageId),
            await PrimitiveEncoder.encodeRepeated(
                identifier.moduleName.split('.'),
                PrimitiveEncoder.encodeString
            ),
            await PrimitiveEncoder.encodeRepeated(
                identifier.entityName.split('.'),
                PrimitiveEncoder.encodeString
            )
        )
    }

    static async encodeTextMapEntry(entry: TextMap_Entry): Promise<Uint8Array> {
        return Encoder.concatBytes(
            await PrimitiveEncoder.encodeString(entry.key),
            await PrimitiveEncoder.encodeValue(entry.value!)
        )
    }

    static async encodeRecordField(field: RecordField): Promise<Uint8Array> {
        return Encoder.concatBytes(
            await PrimitiveEncoder.encodeOptional(
                field.label,
                PrimitiveEncoder.encodeString
            ),
            await PrimitiveEncoder.encodeValue(field.value!)
        )
    }

    static async encodeGenMapEntry(entry: GenMap_Entry): Promise<Uint8Array> {
        return Encoder.concatBytes(
            await PrimitiveEncoder.encodeValue(entry.key!),
            await PrimitiveEncoder.encodeValue(entry.value!)
        )
    }

    static encodeNodeId(
        nodesDict: Record<string, DamlTransaction_Node>,
        nodeSeeds: DamlTransaction_NodeSeed[]
    ): (nodeId: string) => Promise<Uint8Array> {
        return async (nodeId: string): Promise<Uint8Array> => {
            const node = nodesDict[nodeId]
            if (!node) {
                throw new Error(
                    `Node with ID ${nodeId} not found in transaction`
                )
            }

            const encodedNode = await this.encodeNode(
                node,
                nodesDict,
                nodeSeeds
            )
            return Encoder.sha256(encodedNode)
        }
    }

    static async encodeInputContract(contract: Metadata_InputContract) {
        if (contract.contract.oneofKind === 'v1')
            return Encoder.concatBytes(
                await PrimitiveEncoder.encodeInt('64', contract.createdAt),
                await Encoder.sha256(
                    await this.encodeCreateNode(
                        contract.contract.v1,
                        'unused_node_id',
                        []
                    )
                )
            )
        else throw new Error('Unsupported contract version')
    }
}
