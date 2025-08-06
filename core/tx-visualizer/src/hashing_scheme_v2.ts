import {
  DamlTransaction,
  DamlTransaction_Node,
  DamlTransaction_NodeSeed,
  HashingSchemeVersion,
  Metadata,
  Metadata_InputContract,
  PreparedTransaction,
} from "./_gen/com/daml/ledger/api/v2/interactive/interactive_submission_service";
import {
  Create,
  Exercise,
  Fetch,
  Rollback,
} from "./_gen/com/daml/ledger/api/v2/interactive/transaction/v1/interactive_submission_data";
import {
  GenMap_Entry,
  Identifier,
  RecordField,
  TextMap_Entry,
  Value,
} from "./_gen/com/daml/ledger/api/v2/value";
import { mkByteArray, sha256 } from "./utils";

// Hash purpose reserved for prepared transaction
const PREPARED_TRANSACTION_HASH_PURPOSE = Uint8Array.from([
  0x00, 0x00, 0x00, 0x30,
]);
const NODE_ENCODING_VERSION = Uint8Array.from([0x01]);

const HASHING_SCHEME_VERSION = Uint8Array.from([
  HashingSchemeVersion.HASHING_SCHEME_VERSION_V2,
]);

async function encodeBool(value: boolean): Promise<Uint8Array> {
  return new Uint8Array([value ? 1 : 0]);
}

async function encodeInt32(value: number): Promise<Uint8Array> {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setInt32(0, value, false); // true for little-endian
  return new Uint8Array(buffer);
}

async function encodeInt64(
  value: bigint | number | undefined
): Promise<Uint8Array> {
  const num = typeof value === "bigint" ? value : BigInt(value || 0);
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setBigInt64(0, num, false); // true for little-endian
  return new Uint8Array(buffer);
}

async function encodeString(value: string = ""): Promise<Uint8Array> {
  const utf8Bytes = new TextEncoder().encode(value);
  return encodeBytes(utf8Bytes);
}

async function encodeBytes(value: Uint8Array): Promise<Uint8Array> {
  const length = await encodeInt32(value.length);
  return mkByteArray(length, value);
}

async function encodeHash(value: Uint8Array): Promise<Uint8Array> {
  return value;
}

function encodeHexString(value: string = ""): Promise<Uint8Array> {
  // Convert hex string to Uint8Array
  const bytes = new Uint8Array(value.length / 2);
  for (let i = 0; i < value.length; i += 2) {
    bytes[i / 2] = parseInt(value.slice(i, i + 2), 16);
  }
  return encodeBytes(bytes);
}

// Maybe suspicious?
async function encodeOptional<T>(
  value: T | undefined | null,
  encodeFn: (arg: T) => Promise<Uint8Array>
): Promise<Uint8Array> {
  if (value === undefined || value === null) {
    return new Uint8Array([0]); // Return empty array for undefined fields
  } else {
    return mkByteArray(1, await encodeFn(value));
  }
}

// Maybe suspicious?
async function encodeProtoOptional<T, P extends object>(
  parentValue: P,
  fieldName: keyof P,
  value: T,
  encodeFn: (value: T) => Promise<Uint8Array>
): Promise<Uint8Array> {
  if (parentValue && parentValue[fieldName] !== undefined) {
    return mkByteArray(1, await encodeFn(value));
  } else {
    return new Uint8Array([0]); // Return empty array for undefined fields
  }
}

async function encodeRepeated<T>(
  values: T[] = [],
  encodeFn: (value: T) => Promise<Uint8Array>
): Promise<Uint8Array> {
  const length = await encodeInt32(values.length);
  const encodedValues = await Promise.all(values.map(encodeFn));
  return mkByteArray(length, ...encodedValues);
}

function findSeed(
  nodeId: string,
  nodeSeeds: DamlTransaction_NodeSeed[]
): Uint8Array {
  const seed = nodeSeeds.find(
    (seed) => seed.nodeId.toString() === nodeId
  )?.seed;
  if (!seed) {
    throw new Error(`Seed for node ID ${nodeId} not found`);
  }

  return seed;
}

async function encodeIdentifier(identifier: Identifier): Promise<Uint8Array> {
  return mkByteArray(
    await encodeString(identifier.packageId),
    await encodeRepeated(identifier.moduleName.split("."), encodeString),
    await encodeRepeated(identifier.entityName.split("."), encodeString)
  );
}

async function encodeMetadata(metadata: Metadata): Promise<Uint8Array> {
  return mkByteArray(
    1,
    await encodeRepeated(metadata.submitterInfo?.actAs, encodeString),
    await encodeString(metadata.submitterInfo?.commandId),
    await encodeString(metadata.transactionUuid),
    await encodeInt32(metadata.mediatorGroup),
    await encodeString(metadata.synchronizerId),
    await encodeProtoOptional(
      metadata,
      "minLedgerEffectiveTime",
      metadata.minLedgerEffectiveTime,
      encodeInt64
    ),
    await encodeProtoOptional(
      metadata,
      "maxLedgerEffectiveTime",
      metadata.maxLedgerEffectiveTime,
      encodeInt64
    ),
    await encodeRepeated(metadata.inputContracts, encodeInputContract)
  );
}

async function encodeCreateNode(
  create: Create | undefined,
  nodeId: string,
  nodeSeeds: DamlTransaction_NodeSeed[]
): Promise<Uint8Array> {
  return create
    ? mkByteArray(
        NODE_ENCODING_VERSION,
        await encodeString(create.lfVersion),
        0 /** Create node tag */,
        await encodeOptional(findSeed(nodeId, nodeSeeds), encodeHash),
        await encodeHexString(create.contractId),
        await encodeString(create.packageName),
        await encodeIdentifier(create.templateId!),
        await encodeValue(create.argument!),
        await encodeRepeated(create.signatories, encodeString),
        await encodeRepeated(create.stakeholders, encodeString)
      )
    : mkByteArray();
}

async function encodeExerciseNode(
  exercise: Exercise,
  nodeId: string,
  nodesDict: Record<string, DamlTransaction_Node>,
  nodeSeeds: DamlTransaction_NodeSeed[]
): Promise<Uint8Array> {
  return mkByteArray(
    NODE_ENCODING_VERSION,
    await encodeString(exercise.lfVersion),
    1 /** Exercise node tag */,
    await encodeHash(findSeed(nodeId, nodeSeeds)),
    await encodeHexString(exercise.contractId),
    await encodeString(exercise.packageName),
    await encodeIdentifier(exercise.templateId!),
    await encodeRepeated(exercise.signatories, encodeString),
    await encodeRepeated(exercise.actingParties, encodeString),
    await encodeProtoOptional(
      exercise,
      "interfaceId",
      exercise.interfaceId!,
      encodeIdentifier
    ),
    await encodeString(exercise.choiceId),
    await encodeValue(exercise.chosenValue!),
    await encodeBool(exercise.consuming),
    await encodeProtoOptional(
      exercise,
      "exerciseResult",
      exercise.exerciseResult!,
      encodeValue
    ),
    await encodeRepeated(exercise.choiceObservers, encodeString),
    await encodeRepeated(exercise.children, encodeNodeId(nodesDict, nodeSeeds))
  );
}

async function encodeFetchNode(fetch: Fetch): Promise<Uint8Array> {
  return mkByteArray(
    NODE_ENCODING_VERSION,
    await encodeString(fetch.lfVersion),
    2 /** Fetch node tag */,
    await encodeHexString(fetch.contractId),
    await encodeString(fetch.packageName),
    await encodeIdentifier(fetch.templateId!),
    await encodeRepeated(fetch.signatories, encodeString),
    await encodeRepeated(fetch.stakeholders, encodeString),
    await encodeProtoOptional(
      fetch,
      "interfaceId",
      fetch.interfaceId!,
      encodeIdentifier
    ),
    await encodeRepeated(fetch.actingParties, encodeString)
  );
}

async function encodeRollbackNode(
  rollback: Rollback,
  nodesDict: Record<string, DamlTransaction_Node>,
  nodeSeeds: DamlTransaction_NodeSeed[]
): Promise<Uint8Array> {
  return mkByteArray(
    NODE_ENCODING_VERSION,
    3 /** Rollback node tag */,
    await encodeRepeated(rollback.children, encodeNodeId(nodesDict, nodeSeeds))
  );
}

async function encodeInputContract(contract: Metadata_InputContract) {
  return mkByteArray(
    await encodeInt64(contract.createdAt),
    await sha256(await encodeCreateNode(contract.v1, "unused_node_id", []))
  );
}

async function encodeValue(value: Value): Promise<Uint8Array> {
  if (value["unit"]) {
    return Uint8Array.from([0]); // Unit value
  } else if (value["bool"]) {
    return mkByteArray(0x01, await encodeBool(value.bool));
  } else if (value["int64"]) {
    return mkByteArray(0x02, await encodeInt64(value.int64));
  } else if (value["numeric"]) {
    return mkByteArray(0x03, await encodeString(value.numeric));
  } else if (value["timestamp"]) {
    return mkByteArray(0x04, await encodeInt64(value.timestamp));
  } else if (value["date"]) {
    return mkByteArray(0x05, await encodeInt32(value.date));
  } else if (value["party"]) {
    return mkByteArray(0x06, await encodeString(value.party));
  } else if (value["text"]) {
    return mkByteArray(0x07, await encodeString(value.text));
  } else if (value["contractId"]) {
    return mkByteArray(0x08, await encodeHexString(value.contractId));
  } else if (value["optional"]) {
    return mkByteArray(
      0x09,
      await encodeProtoOptional(
        value.optional,
        "value",
        value.optional.value as Value,
        encodeValue
      )
    );
  } else if (value["list"]) {
    return mkByteArray(
      0x0a,
      await encodeRepeated(value.list.elements, encodeValue)
    );
  } else if (value["textMap"]) {
    return mkByteArray(
      0x0b,
      await encodeRepeated(value.textMap?.entries, encodeTextMapEntry)
    );
  } else if (value["record"]) {
    return mkByteArray(
      0x0c,
      await encodeProtoOptional(
        value.record,
        "recordId",
        value.record.recordId!,
        encodeIdentifier
      ),
      await encodeRepeated(value.record.fields, encodeRecordField)
    );
  } else if (value["variant"]) {
    return mkByteArray(
      0x0d,
      await encodeProtoOptional(
        value.variant,
        "variantId",
        value.variant.variantId!,
        encodeIdentifier
      ),
      await encodeString(value.variant.constructor),
      await encodeValue(value.variant.value!)
    );
  } else if (value["enum"]) {
    return mkByteArray(
      0x0e,
      await encodeProtoOptional(
        value.enum,
        "enumId",
        value.enum.enumId!,
        encodeIdentifier
      ),
      await encodeString(value.enum.constructor)
    );
  } else if (value["genMap"]) {
    return mkByteArray(
      0x0f,
      await encodeRepeated(value.genMap?.entries, encodeGenMapEntry)
    );
  }

  throw new Error("Unsupported value type: " + JSON.stringify(value));
}

async function encodeTextMapEntry(entry: TextMap_Entry): Promise<Uint8Array> {
  return mkByteArray(
    await encodeString(entry.key),
    await encodeValue(entry.value!)
  );
}

async function encodeRecordField(field: RecordField): Promise<Uint8Array> {
  return mkByteArray(
    await encodeOptional(field.label, encodeString),
    await encodeValue(field.value!)
  );
}

async function encodeGenMapEntry(entry: GenMap_Entry): Promise<Uint8Array> {
  return mkByteArray(
    await encodeValue(entry.key!),
    await encodeValue(entry.value!)
  );
}

function encodeNodeId(
  nodesDict: Record<string, DamlTransaction_Node>,
  nodeSeeds: DamlTransaction_NodeSeed[]
): (nodeId: string) => Promise<Uint8Array> {
  return async (nodeId: string): Promise<Uint8Array> => {
    const node = nodesDict[nodeId];
    if (!node) {
      throw new Error(`Node with ID ${nodeId} not found in transaction`);
    }

    const encodedNode = await encodeNode(node, nodesDict, nodeSeeds);
    return sha256(encodedNode);
  };
}

async function encodeNode(
  node: DamlTransaction_Node,
  nodesDict: Record<string, DamlTransaction_Node>,
  nodeSeeds: DamlTransaction_NodeSeed[]
): Promise<Uint8Array> {
  if (node.v1) {
    if (node.v1.create) {
      return encodeCreateNode(node.v1.create, node.nodeId, nodeSeeds);
    } else if (node.v1.exercise) {
      return encodeExerciseNode(
        node.v1.exercise,
        node.nodeId,
        nodesDict,
        nodeSeeds
      );
    } else if (node.v1.fetch) {
      return encodeFetchNode(node.v1.fetch);
    } else if (node.v1.rollback) {
      return encodeRollbackNode(node.v1.rollback, nodesDict, nodeSeeds);
    }

    throw new Error("Unsupported node type");
  } else {
    throw new Error(`Unsupported node version`);
  }
}

function createNodesDict(
  preparedTransaction: PreparedTransaction
): Record<string, DamlTransaction_Node> {
  const nodesDict: Record<string, DamlTransaction_Node> = {};
  const nodes = preparedTransaction.transaction?.nodes || [];
  for (const node of nodes) {
    nodesDict[node.nodeId] = node;
  }
  return nodesDict;
}

async function encodeTransaction(
  transaction: DamlTransaction,
  nodesDict: Record<string, DamlTransaction_Node>,
  nodeSeeds: DamlTransaction_NodeSeed[]
): Promise<Uint8Array> {
  return mkByteArray(
    await encodeString(transaction.version),
    await encodeRepeated(transaction.roots, encodeNodeId(nodesDict, nodeSeeds))
  );
}

async function hashTransaction(
  transaction: DamlTransaction,
  nodesDict: Record<string, DamlTransaction_Node>
): Promise<Uint8Array> {
  const encodedTransaction = await encodeTransaction(
    transaction,
    nodesDict,
    transaction.nodeSeeds
  );

  const hash = await sha256(
    await mkByteArray(PREPARED_TRANSACTION_HASH_PURPOSE, encodedTransaction)
  );

  return hash;
}

async function hashMetadata(metadata: Metadata): Promise<Uint8Array> {
  const hash = await sha256(
    await mkByteArray(
      PREPARED_TRANSACTION_HASH_PURPOSE,
      await encodeMetadata(metadata)
    )
  );

  return hash;
}

async function encodePreparedTransaction(
  preparedTransaction: PreparedTransaction
): Promise<Uint8Array> {
  const nodesDict = createNodesDict(preparedTransaction);

  const transactionHash = await hashTransaction(
    preparedTransaction.transaction!,
    nodesDict
  );
  const metadataHash = await hashMetadata(preparedTransaction.metadata!);

  return mkByteArray(
    PREPARED_TRANSACTION_HASH_PURPOSE,
    HASHING_SCHEME_VERSION,
    transactionHash,
    metadataHash
  );
}

export async function computePreparedTransaction(
  preparedTransaction: PreparedTransaction
): Promise<Uint8Array> {
  return sha256(await encodePreparedTransaction(preparedTransaction));
}