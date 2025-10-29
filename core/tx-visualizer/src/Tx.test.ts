// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from '@jest/globals'
import { PreparedTransaction } from '@canton-network/core-ledger-proto'
import * as path from 'path'
import { readFileSync } from 'fs'
import {
    decodePreparedTransaction,
    decodeTopologyTransaction,
    hashPreparedTransaction,
} from '.'
import camelcaseKeys from 'camelcase-keys'

test('decode a base 64 encoded prepared tx', async () => {
    const base64EncodedPreparedTx =
        'Cp8GCgMyLjESATAa8AUKATDCPukFCuYFCgMyLjESQjAwNTUwODAyZGRiMTYzNzFmNWZjNmQzNjRlNmNkNGIzMjgzYTllYjVjMGNjYjEyMWFlMzY4Y2RlYmJhZDBmYmY1NhoOQWRtaW5Xb3JrZmxvd3MiXgpAMmEzOGI5NjNmNmFiZjQ1Yjc2YzcwMmY5NzAwYmZkOTA2MDU1NTg3MmFmOTE1ZWY3ZjhmNjg3OTVlMmM4MzFiZBIUQ2FudG9uLkludGVybmFsLlBpbmcaBFBpbmcqtgJyswIKXgpAMmEzOGI5NjNmNmFiZjQ1Yjc2YzcwMmY5NzAwYmZkOTA2MDU1NTg3MmFmOTE1ZWY3ZjhmNjg3OTVlMmM4MzFiZBIUQ2FudG9uLkludGVybmFsLlBpbmcaBFBpbmcSDwoCaWQSCUIHcGluZ19pZBJdCglpbml0aWF0b3ISUDpOb3BlcmF0b3I6OjEyMjBkNDRmYzFjM2JhMGI1YmRmN2I5NTZlZTcxYmM5NGViZTJkMjMyNThkYzI2OGZkZjA4MjRmYmFlZmYyYzYxNDI0EmEKCXJlc3BvbmRlchJUOlJwYXJ0aWNpcGFudDE6OjEyMjBkNDRmYzFjM2JhMGI1YmRmN2I5NTZlZTcxYmM5NGViZTJkMjMyNThkYzI2OGZkZjA4MjRmYmFlZmYyYzYxNDI0Mk5vcGVyYXRvcjo6MTIyMGQ0NGZjMWMzYmEwYjViZGY3Yjk1NmVlNzFiYzk0ZWJlMmQyMzI1OGRjMjY4ZmRmMDgyNGZiYWVmZjJjNjE0MjQ6Tm9wZXJhdG9yOjoxMjIwZDQ0ZmMxYzNiYTBiNWJkZjdiOTU2ZWU3MWJjOTRlYmUyZDIzMjU4ZGMyNjhmZGYwODI0ZmJhZWZmMmM2MTQyNDpScGFydGljaXBhbnQxOjoxMjIwZDQ0ZmMxYzNiYTBiNWJkZjdiOTU2ZWU3MWJjOTRlYmUyZDIzMjU4ZGMyNjhmZGYwODI0ZmJhZWZmMmM2MTQyNCIiEiBr2qJTURRRnXWp6y1EyXQiB69cfe50kJw0eYN1UF39nhL1ARJ2Ck5vcGVyYXRvcjo6MTIyMGQ0NGZjMWMzYmEwYjViZGY3Yjk1NmVlNzFiYzk0ZWJlMmQyMzI1OGRjMjY4ZmRmMDgyNGZiYWVmZjJjNjE0MjQSJGYyZWM0ZDhmLWNjYzEtNDAyYi1iMjc4LTc1NTZmZGQyYjQxMhpMd2FsbGV0OjoxMjIwZTdiMjNlYTUyZWI1YzY3MmZiMGIxY2RiYzkxNjkyMmZmZWQzZGQ3Njc2YzIyM2E2MDU2NjQzMTVlMmQ0M2VkZCokYTMyODE2MmUtNzI4ZS00ZTA1LWFjNzgtYjM0ZjA3MDk4M2JhMK7Y9/LU944D'

    const preparedTx = decodePreparedTransaction(base64EncodedPreparedTx)

    const __dirname = path.resolve()
    const resolvedFilePath = path.join(
        __dirname,
        '../tx-visualizer/create_ping_prepared_response.json'
    )
    const preapredTXJson = JSON.parse(readFileSync(resolvedFilePath, 'utf-8'))
    const camelCasePreparedTx = camelcaseKeys(preapredTXJson, { deep: true })
    const message = PreparedTransaction.fromJson(camelCasePreparedTx)

    expect(message === preparedTx)
})

test('hash from preparedTx ledger api call should match calculated hash', async () => {
    const preparedTxFromLedgerAPi =
        'f97Cv1BO7QS7jmSY03p56JGsPf60Vx/ABXmRub7iiQI='

    const preparedTx2 =
        'CsoHCgMyLjESATAamwcKATDCPpQHCpEHCgMyLjESQjAwMTY4Nzc3ODEwNzU3MmJlZWVjYzQzODk3MmQxODQ4M2VhZDI1MGQxZDUwYmI2MzU3ZjdmYjhmNjdkY2U3ZDYzNRoNc3BsaWNlLXdhbGxldCKCAQpAZWI2ZTAxZWZhY2MzMzk3ZTIzYzZiZThiOWJlN2RiNGJmMzc2NzIyMTE5NzRkNjllMjRiNDg5ODBlMmY5OGI3ZRIhU3BsaWNlLldhbGxldC5UcmFuc2ZlclByZWFwcHJvdmFsGhtUcmFuc2ZlclByZWFwcHJvdmFsUHJvcG9zYWwqtQNysgMKggEKQGViNmUwMWVmYWNjMzM5N2UyM2M2YmU4YjliZTdkYjRiZjM3NjcyMjExOTc0ZDY5ZTI0YjQ4OTgwZTJmOThiN2USIVNwbGljZS5XYWxsZXQuVHJhbnNmZXJQcmVhcHByb3ZhbBobVHJhbnNmZXJQcmVhcHByb3ZhbFByb3Bvc2FsElcKCHJlY2VpdmVyEks6SWJvYjo6MTIyMDViZTNiOWQxNzc1NzNmZmZiNjhlYjI0NTk4NmY4OGI5ZGY1OGQ0NGNlNTc1ODE5MDc4OTcwNTgwZDg3ZDFkYzAScgoIcHJvdmlkZXISZjpkYXBwX3VzZXJfbG9jYWxuZXQtbG9jYWxwYXJ0eS0xOjoxMjIwM2E1MmZlNWFmM2I4N2UwNjk2MTgyYWM2NjhhNmNiMzE1ZGFiNGJkYzMwZGE5ZTViNmRkYTllYjcyODc4NDIxNhJeCgtleHBlY3RlZERzbxJPUk0KSzpJRFNPOjoxMjIwYmJkMDAwYjY5ODc1NzNiOGMwOWY0NDRlNGRmNTUwOWFmODk5N2I4MzkxMDlkN2UyYzIxMmQ1NDdmMGFmMDk1MDJJYm9iOjoxMjIwNWJlM2I5ZDE3NzU3M2ZmZmI2OGViMjQ1OTg2Zjg4YjlkZjU4ZDQ0Y2U1NzU4MTkwNzg5NzA1ODBkODdkMWRjMDpkYXBwX3VzZXJfbG9jYWxuZXQtbG9jYWxwYXJ0eS0xOjoxMjIwM2E1MmZlNWFmM2I4N2UwNjk2MTgyYWM2NjhhNmNiMzE1ZGFiNGJkYzMwZGE5ZTViNmRkYTllYjcyODc4NDIxNjpJYm9iOjoxMjIwNWJlM2I5ZDE3NzU3M2ZmZmI2OGViMjQ1OTg2Zjg4YjlkZjU4ZDQ0Y2U1NzU4MTkwNzg5NzA1ODBkODdkMWRjMCIiEiDBzeNcgqLvsssBxhNx7wP9pK71TsAprgz+a8jag/Lb3RL3ARJxCklib2I6OjEyMjA1YmUzYjlkMTc3NTczZmZmYjY4ZWIyNDU5ODZmODhiOWRmNThkNDRjZTU3NTgxOTA3ODk3MDU4MGQ4N2QxZGMwEiQ5NzU4ZTQ2ZS05ZmJlLTRmOTQtOTczZC04NWQ5ZTBmMTMyNzUaU2dsb2JhbC1kb21haW46OjEyMjBiYmQwMDBiNjk4NzU3M2I4YzA5ZjQ0NGU0ZGY1NTA5YWY4OTk3YjgzOTEwOWQ3ZTJjMjEyZDU0N2YwYWYwOTUwKiQ5NGJkYmFmNS0wYjJjLTQwYmMtOTZjZC1jM2M5YTlkODQ3ZDIw+eaGkdz0jwM='

    const hashResult = await hashPreparedTransaction(preparedTx2, 'base64')

    expect(hashResult === preparedTxFromLedgerAPi)
})

test('decode a base 64 encoded topology tx', async () => {
    const namespaceDelegationBase64 =
        'CosBCAEQARqEAQqBAQpEMTIyMDEyMzA4N2U2YmY2NmQyMjVkMDQ3ZTZhZjhiMDk0NGJjNTBjYzQ3MGNiNDZhZmQ5NTE1YTU1OGJmNTU2MDU0NDESNxAEGiwwKjAFBgMrZXADIQD6i6Mh8nmGPt1X6XoI8ZfRh2D3eozd7HgsY/abhbRNeyoDAQUEMAEiABAe'

    const partyToKeyMappingBase64 =
        'CpMBCAEQARqMAYIBiAEKS2FsaWNlOjoxMjIwNWE1MGViOWI5ZDY0YmIzMGFjNDEyNWFmYTFhZWVhN2JjYWU1MTc5MmFjMmQxNzRhNjEzMmNlZWM5MjkwZDA2MhgBIjcQBBosMCowBQYDK2VwAyEAA5ufeUjSCCrbYVs4FipJRBhJQIFYKL++qE2t8lEccgoqAwEFBDABEB4='

    const partyToParticipantMappingBase64 =
        'CrABCAEQARqpAUqmAQpLYWxpY2U6OjEyMjA1YTUwZWI5YjlkNjRiYjMwYWM0MTI1YWZhMWFlZWE3YmNhZTUxNzkyYWMyZDE3NGE2MTMyY2VlYzkyOTBkMDYyEAEaVQpRcGFydGljaXBhbnQ6OjEyMjAyZTk1ZDJmNjFlZmU3YjIzMmI2ZDE2M2ZlMDA2MTg4YWYzYjZiMDU4ODViZDU5ZDQ3ZTUyZTE3NjUwMWI1NmNkEAIQHg=='
    const decodedNameSpaceDelegation = decodeTopologyTransaction(
        namespaceDelegationBase64
    )

    const decodedPartyToKeyMapping = decodeTopologyTransaction(
        partyToKeyMappingBase64
    )

    const decodedPartyToParticipantMapping = decodeTopologyTransaction(
        partyToParticipantMappingBase64
    )

    expect(
        decodedPartyToKeyMapping.mapping?.mapping.oneofKind ===
            'partyToKeyMapping'
    )

    if (
        decodedPartyToKeyMapping.mapping?.mapping.oneofKind ===
        'partyToKeyMapping'
    ) {
        expect(
            decodedPartyToKeyMapping.mapping?.mapping.partyToKeyMapping
                .party ===
                'alice::12205a50eb9b9d64bb30ac4125afa1aeea7bcae51792ac2d174a6132ceec9290d062' &&
                decodedPartyToKeyMapping.mapping?.mapping.partyToKeyMapping
                    .threshold === 1
        )
    }

    expect(
        decodedPartyToParticipantMapping.mapping?.mapping.oneofKind ===
            'partyToParticipant'
    )

    if (
        decodedPartyToParticipantMapping.mapping?.mapping.oneofKind ===
        'partyToParticipant'
    ) {
        expect(
            decodedPartyToParticipantMapping.mapping?.mapping.partyToParticipant
                .party ===
                'alice::12205a50eb9b9d64bb30ac4125afa1aeea7bcae51792ac2d174a6132ceec9290d062' &&
                decodedPartyToParticipantMapping.mapping?.mapping.partyToParticipant.participants.find(
                    (p) =>
                        p.participantUid ===
                        'participant::12202e95d2f61efe7b232b6d163fe006188af3b6b05885bd59d47e52e176501b56cd'
                )
        )
    }

    expect(
        decodedNameSpaceDelegation.mapping?.mapping.oneofKind ===
            'namespaceDelegation'
    )
})
