// TODO(#180): remove this when no longer needed

import { execSync } from 'child_process'
import fs from 'fs'
import { getRepoRoot } from './utils.js'

const repoRoot = getRepoRoot()

const outdir = `${repoRoot}/clients/remote/src/generated`
const roots = [
    `${repoRoot}/.canton/protobuf/community`,
    `${repoRoot}/.canton/protobuf/lib`,
]
const protos = [
    `${repoRoot}/.canton/protobuf/community/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.proto`,
    `${repoRoot}/.canton/protobuf/community/com/digitalasset/canton/topology/admin/v30/common.proto`,
    `${repoRoot}/.canton/protobuf/community/com/digitalasset/canton/protocol/v30/topology.proto`,
    `${repoRoot}/.canton/protobuf/community/com/digitalasset/canton/crypto/v30/crypto.proto`,
]

function generateProtos() {
    const protocCommand = [
        'grpc_tools_node_protoc',
        `--ts_out ${outdir}`,
        '--ts_opt generate_dependencies',
        ...roots.map((root) => `-I ${root}`),
        ...protos,
    ].join(' ')

    try {
        execSync(protocCommand, { stdio: 'inherit' })
        console.log('Protobuf files generated successfully.')
    } catch (error) {
        console.error('Error generating protobuf files:', error)
        process.exit(1)
    }
}

function main() {
    fs.mkdirSync(outdir, { recursive: true })
    generateProtos()
}

main()
