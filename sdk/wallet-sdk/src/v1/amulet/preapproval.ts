// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'
import { WalletSdkContext } from '../sdk.js'
import {
    defaultRetryableOptions,
    Types,
} from '@canton-network/core-ledger-client'
import { Ledger } from '../ledger/index.js'
import { PrivateKey } from '@canton-network/core-signing-lib'

export class Preapproval {
    private readonly ledger: Ledger
    constructor(private readonly ctx: WalletSdkContext) {
        this.ledger = new Ledger(ctx)
    }

    public async create(args: {
        parties: {
            receiver: PartyId
            provider: PartyId
            dso?: PartyId
        }
        privateKey: PrivateKey
    }) {
        const { parties, privateKey } = args
        const params: Record<string, unknown> = {
            query: {
                parties: [parties.receiver],
                'package-name': 'splice-wallet',
            },
        }

        const spliceWalletPackageVersionResponse =
            await this.ctx.ledgerClient.getWithRetry(
                '/v2/interactive-submission/preferred-package-version',
                defaultRetryableOptions,
                params
            )

        const version =
            spliceWalletPackageVersionResponse.packagePreference
                ?.packageReference?.packageVersion

        const command: { CreateCommand: Types['CreateCommand'] } = {
            CreateCommand: {
                templateId:
                    '#splice-wallet:Splice.Wallet.TransferPreapproval:TransferPreapprovalProposal',
                createArguments: {
                    provider: parties.provider,
                    receiver: parties.receiver,
                },
            },
        }

        if (compareVersions(version!, '0.1.11') === 1) {
            if (!parties.dso) throw new Error('dsoParty is undefined')
            Object.defineProperty(
                command.CreateCommand.createArguments,
                'expectedDso',
                parties.dso
            )
        }

        return (
            await this.ledger.prepare({
                partyId: parties.receiver,
                commands: command,
            })
        )
            .sign(privateKey)
            .execute({
                partyId: parties.receiver,
            })
    }

    public async fetch() {}

    public async renew() {}

    public async cancel() {}
}

function compareVersions(v1: string, v2: string): number {
    const a = v1.split('.').map(Number)
    const b = v2.split('.').map(Number)
    const length = Math.max(a.length, b.length)

    for (let i = 0; i < length; i++) {
        const num1 = a[i] ?? 0
        const num2 = b[i] ?? 0

        if (num1 > num2) return 1
        if (num1 < num2) return -1
    }

    return 0
}
