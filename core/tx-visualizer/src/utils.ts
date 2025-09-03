// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
/** Take a base64 encoded string and return a Uint8Array of the decoded bytes */
export function fromBase64(b64: string): Uint8Array {
    const binaryString = atob(b64)
    const len = binaryString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes
}

/** Take a byte buffer (Uint8Array) and encode it into a base64 string */
export function toBase64(data: Uint8Array): string {
    let binaryString = ''
    const len = data.byteLength
    for (let i = 0; i < len; i++) {
        binaryString += String.fromCharCode(data[i])
    }
    return btoa(binaryString)
}

/** Take a byte buffer (Uint8Array) and encode it into a hex string */
export function toHex(bytes: Uint8Array): string {
    return Array.from(bytes)
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('')
}

export async function sha256(
    message: string | Uint8Array
): Promise<Uint8Array> {
    const msg =
        typeof message === 'string'
            ? new TextEncoder().encode(message)
            : message

    return crypto.subtle
        .digest('SHA-256', new Uint8Array(msg))
        .then((hash) => new Uint8Array(hash))
}

/** Utility to concatenate byte arrays or single bytes */
export async function mkByteArray(
    ...args: (number | Uint8Array)[]
): Promise<Uint8Array> {
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
