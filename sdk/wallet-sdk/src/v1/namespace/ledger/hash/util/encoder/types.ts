// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    DamlTransaction,
    Metadata,
    PreparedTransaction,
} from '@canton-network/core-ledger-proto'
import { Converter } from '../../converter'

export interface HashEncoder<
    HashValue extends Metadata | DamlTransaction | PreparedTransaction | string,
> {
    hash: (value: HashValue) => Promise<Uint8Array | Converter>
}

type ArgType<Union, OneOfKind> = Extract<Union, { oneofKind: OneOfKind }>
export type ArgValueOneOfKind<Union, OneOfKind> = Exclude<
    ArgType<Union, OneOfKind>[keyof ArgType<Union, OneOfKind>],
    OneOfKind
>
