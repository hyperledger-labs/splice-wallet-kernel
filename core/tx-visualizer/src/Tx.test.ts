import { expect, test } from '@jest/globals'
import { PreparedTransaction } from './_gen/com/daml/ledger/api/v2/interactive/interactive_submission_service'
import * as path from 'path'
import { readFileSync } from 'fs'
import { decodePreparedTransaction } from '.'
import camelcaseKeys from 'camelcase-keys'



test('test blah', async () => {

    const __dirname = path.resolve()
    const resolvedFilePath = path.join(__dirname, '../tx-visualizer/create_ping_prepare_response.json')

    const preapredTXJson = JSON.parse(readFileSync(resolvedFilePath, 'utf-8'))

    console.log("Parsed json " + JSON.stringify(preapredTXJson))
    const camelCasePreparedTx = camelcaseKeys(preapredTXJson, {deep: true})

    console.log("Converted json " + JSON.stringify(camelCasePreparedTx))


    const message = PreparedTransaction.fromJSON(camelCasePreparedTx)

    const protoBytes = PreparedTransaction.encode(message).finish()
    const base64String = Buffer.from(protoBytes).toString('base64')

    console.log("Message is ", message)
    console.log("Base 64 encoded protobuf: ", base64String)

    const r = decodePreparedTransaction(base64String)
    console.log("decode function test: " + JSON.stringify(r))

    expect(1 === 1)

})