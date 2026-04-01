// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export class Converter {
    constructor(private readonly hash: Uint8Array) {}

    public toHex(): string {
        return Array.from(this.hash)
            .map((byte) => byte.toString(16).padStart(2, '0'))
            .join('')
    }

    public toBase64(): string {
        let binaryString = ''
        const len = this.hash.byteLength
        for (let i = 0; i < len; i++) {
            binaryString += String.fromCharCode(this.hash[i])
        }
        return btoa(binaryString)
    }
}
