import { PartyId } from '@canton-network/core-types'

export type partyDefinition = {
    keyPair: { publicKey: string; privateKey: string }
    partyId: PartyId
}

export function getRandomElement<T>(arr: T[]): T | undefined {
    if (arr.length === 0) {
        return undefined // Return undefined for an empty array
    }
    const randomIndex = Math.floor(Math.random() * arr.length)
    return arr[randomIndex]
}

export async function parallelize<T>(count: number, fn: () => Promise<T>) {
    return Promise.all(Array.from({ length: count }, fn))
}
