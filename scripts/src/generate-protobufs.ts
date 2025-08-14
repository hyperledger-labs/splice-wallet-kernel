// TODO(#180): remove this when no longer needed

import { execFileSync } from 'child_process'
import fs from 'fs'
import { ensureDir, getRepoRoot, traverseDirectory } from './utils.js'

const repoRoot = getRepoRoot()

const outdir = `${repoRoot}/clients/remote/src/_proto`
const roots = [
    `${repoRoot}/.canton/protobuf/community`,
    `${repoRoot}/.canton/protobuf/lib`,
]
const protos = [
    `${repoRoot}/.canton/protobuf/community/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.proto`,
    `${repoRoot}/.canton/protobuf/community/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.proto`,
    `${repoRoot}/.canton/protobuf/community/com/digitalasset/canton/topology/admin/v30/common.proto`,
    `${repoRoot}/.canton/protobuf/community/com/digitalasset/canton/protocol/v30/topology.proto`,
    `${repoRoot}/.canton/protobuf/community/com/digitalasset/canton/crypto/v30/crypto.proto`,
]

function generateProtos() {
    const protocArgs = [
        `--ts_out=${outdir}`,
        '--ts_opt=generate_dependencies',
        ...roots.map((root) => `-I${root}`),
        ...protos,
    ]

    try {
        execFileSync('grpc_tools_node_protoc', protocArgs, { stdio: 'inherit' })
        console.log('Protobuf files generated successfully.')
    } catch (error) {
        console.error('Error generating protobuf files:', error)
        process.exit(1)
    }
}

// The protobuf plugin we're using, @protobuf-ts/plugin, generates files with relative imports that do not include the .js extension.
// This is required in ESModule projects using NodeJS (non-bundler mode).
// See: https://github.com/timostamm/protobuf-ts/issues/182
// This function rewrites those imports to include the .js extension.
function rewriteImports() {
    traverseDirectory(outdir, (file) => {
        const content = fs.readFileSync(file, 'utf8')
        const updated = content
            .split('\n')
            .map((s) =>
                s.replace(/(} from ["']\..+(?<!\.js))(["'];)$/, '$1.js$2')
            )
            .join('\n')
        fs.writeFileSync(`${file}`, updated, 'utf-8')
    })
}

async function main() {
    await ensureDir(outdir)
    generateProtos()
    rewriteImports()
}

main()
