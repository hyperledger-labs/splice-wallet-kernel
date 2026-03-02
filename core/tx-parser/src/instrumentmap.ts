// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

type InstrumentKey = { admin: string; id: string }

/** InstrumentMap is a helper for when you want to group values by instrument. */
export class InstrumentMap<V> {
    private readonly map

    private encodeKey(instrumentId: InstrumentKey): string {
        return JSON.stringify([instrumentId.admin, instrumentId.id])
    }

    private decodeKey(key: string): InstrumentKey {
        const [admin, id] = JSON.parse(key)
        return { admin, id }
    }

    constructor() {
        this.map = new Map<string, V>()
    }

    set(key: InstrumentKey, value: V): void {
        this.map.set(this.encodeKey(key), value)
    }

    get(key: InstrumentKey): V | undefined {
        return this.map.get(this.encodeKey(key))
    }

    has(key: InstrumentKey): boolean {
        return this.map.has(this.encodeKey(key))
    }

    delete(key: InstrumentKey): boolean {
        return this.map.delete(this.encodeKey(key))
    }

    *entries(): IterableIterator<[InstrumentKey, V]> {
        for (const [key, value] of this.map.entries()) {
            yield [this.decodeKey(key), value]
        }
    }
}
