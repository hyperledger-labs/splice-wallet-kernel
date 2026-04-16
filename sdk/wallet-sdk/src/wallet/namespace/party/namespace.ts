// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'
import { ExternalPartyNamespace } from './external/index.js'
import { Ops } from '@canton-network/core-provider-ledger'
import {
    computeMultiHashForTopology,
    computeSha256CantonHash,
} from '@canton-network/core-tx-visualizer'
import { SDKContext } from '../../sdk.js'
import { InternalPartyNamespace } from './index.js'

export class PartyNamespace {
    public readonly internal: InternalPartyNamespace
    public readonly external: ExternalPartyNamespace

    constructor(private readonly ctx: SDKContext) {
        this.internal = new InternalPartyNamespace(ctx)
        this.external = new ExternalPartyNamespace(ctx)
    }

    /**
     * Lists all parties (wallets) the user has access to.
     * @returns A list of unique party IDs.
     */
    public async list(): Promise<PartyId[]> {
        //TODO: what's the best way to handle retries
        const rights =
            await this.ctx.ledgerProvider.request<Ops.GetV2UsersUserIdRights>({
                method: 'ledgerApi',
                params: {
                    requestMethod: 'get',
                    resource: '/v2/users/{user-id}/rights',
                    path: { 'user-id': this.ctx.userId },
                },
            })

        // If user has admin rights, return all local parties
        if (rights.rights?.some((r) => 'CanReadAsAnyParty' in r.kind!)) {
            const parties =
                await this.ctx.ledgerProvider.request<Ops.GetV2Parties>({
                    method: 'ledgerApi',
                    params: {
                        requestMethod: 'get',
                        resource: '/v2/parties',
                        query: {},
                    },
                })
            return parties
                .partyDetails!.filter((p) => p.isLocal)
                .map((p) => p.party)
        }

        // Extract party IDs from all right types
        const parties =
            rights.rights?.flatMap((right) => {
                const { kind } = right
                if (kind == null) return []
                if ('CanActAs' in kind) return kind.CanActAs?.value?.party ?? []
                if ('CanReadAs' in kind)
                    return kind.CanReadAs?.value?.party ?? []
                if ('CanExecuteAs' in kind)
                    return kind.CanExecuteAs?.value?.party ?? []
                return []
            }) ?? []

        return Array.from(new Set(parties))
    }

    /**
     *
     * @param preparedTransactions list of prepared topology transactions
     * @returns a multihash combining all of the topology txs
     */
    public async hashTopologyTx(
        preparedTransactions: Uint8Array<ArrayBufferLike>[] | string[]
    ) {
        let normalized: Uint8Array<ArrayBufferLike>[]
        if (typeof preparedTransactions[0] === 'string') {
            normalized = (preparedTransactions as string[]).map((tx) =>
                Buffer.from(tx, 'base64')
            )
        } else {
            normalized = preparedTransactions as Uint8Array<ArrayBufferLike>[]
        }

        // Prepending the hash purpose for TopologyTransactionSignature and MultiTopologyTransaction
        // https://github.com/hyperledger-labs/splice/blob/53738545af6d0714bddff54c3309ecf2fe6d1881/canton/community/base/src/main/scala/com/digitalasset/canton/crypto/HashPurpose.scala#L47
        const rawHashes = await Promise.all(
            normalized.map((tx) => computeSha256CantonHash(11, tx))
        )
        const combinedHashes = await computeMultiHashForTopology(rawHashes)

        const computedHash = await computeSha256CantonHash(55, combinedHashes)

        return Buffer.from(computedHash).toString('base64')
    }
}
