import { expect, test } from '@jest/globals'
import { PreparedTransaction } from './_gen/com/daml/ledger/api/v2/interactive/interactive_submission_service'
import * as path from 'path'
import { readFileSync } from 'fs'
import { decodePreparedTransaction } from '.'
import camelcaseKeys from 'camelcase-keys'

test('decode a base 64 encoded prepared tx', async () => {
    const base64EncodedPreparedTx =
        'Cp8GCgMyLjESATAa8AUKATDCPukFCuYFCgMyLjESQjAwNTUwODAyZGRiMTYzNzFmNWZjNmQzNjRlNmNkNGIzMjgzYTllYjVjMGNjYjEyMWFlMzY4Y2RlYmJhZDBmYmY1NhoOQWRtaW5Xb3JrZmxvd3MiXgpAMmEzOGI5NjNmNmFiZjQ1Yjc2YzcwMmY5NzAwYmZkOTA2MDU1NTg3MmFmOTE1ZWY3ZjhmNjg3OTVlMmM4MzFiZBIUQ2FudG9uLkludGVybmFsLlBpbmcaBFBpbmcqtgJyswIKXgpAMmEzOGI5NjNmNmFiZjQ1Yjc2YzcwMmY5NzAwYmZkOTA2MDU1NTg3MmFmOTE1ZWY3ZjhmNjg3OTVlMmM4MzFiZBIUQ2FudG9uLkludGVybmFsLlBpbmcaBFBpbmcSDwoCaWQSCUIHcGluZ19pZBJdCglpbml0aWF0b3ISUDpOb3BlcmF0b3I6OjEyMjBkNDRmYzFjM2JhMGI1YmRmN2I5NTZlZTcxYmM5NGViZTJkMjMyNThkYzI2OGZkZjA4MjRmYmFlZmYyYzYxNDI0EmEKCXJlc3BvbmRlchJUOlJwYXJ0aWNpcGFudDE6OjEyMjBkNDRmYzFjM2JhMGI1YmRmN2I5NTZlZTcxYmM5NGViZTJkMjMyNThkYzI2OGZkZjA4MjRmYmFlZmYyYzYxNDI0Mk5vcGVyYXRvcjo6MTIyMGQ0NGZjMWMzYmEwYjViZGY3Yjk1NmVlNzFiYzk0ZWJlMmQyMzI1OGRjMjY4ZmRmMDgyNGZiYWVmZjJjNjE0MjQ6Tm9wZXJhdG9yOjoxMjIwZDQ0ZmMxYzNiYTBiNWJkZjdiOTU2ZWU3MWJjOTRlYmUyZDIzMjU4ZGMyNjhmZGYwODI0ZmJhZWZmMmM2MTQyNDpScGFydGljaXBhbnQxOjoxMjIwZDQ0ZmMxYzNiYTBiNWJkZjdiOTU2ZWU3MWJjOTRlYmUyZDIzMjU4ZGMyNjhmZGYwODI0ZmJhZWZmMmM2MTQyNCIiEiBr2qJTURRRnXWp6y1EyXQiB69cfe50kJw0eYN1UF39nhL1ARJ2Ck5vcGVyYXRvcjo6MTIyMGQ0NGZjMWMzYmEwYjViZGY3Yjk1NmVlNzFiYzk0ZWJlMmQyMzI1OGRjMjY4ZmRmMDgyNGZiYWVmZjJjNjE0MjQSJGYyZWM0ZDhmLWNjYzEtNDAyYi1iMjc4LTc1NTZmZGQyYjQxMhpMd2FsbGV0OjoxMjIwZTdiMjNlYTUyZWI1YzY3MmZiMGIxY2RiYzkxNjkyMmZmZWQzZGQ3Njc2YzIyM2E2MDU2NjQzMTVlMmQ0M2VkZCokYTMyODE2MmUtNzI4ZS00ZTA1LWFjNzgtYjM0ZjA3MDk4M2JhMK7Y9/LU944D'

    const preparedTx = decodePreparedTransaction(base64EncodedPreparedTx)

    const __dirname = path.resolve()
    const resolvedFilePath = path.join(
        __dirname,
        '../tx-visualizer/create_ping_prepare_response.json'
    )

    const preapredTXJson = JSON.parse(readFileSync(resolvedFilePath, 'utf-8'))
    const camelCasePreparedTx = camelcaseKeys(preapredTXJson, { deep: true })

    const message = PreparedTransaction.fromJSON(camelCasePreparedTx)

    expect(message === preparedTx)
})
