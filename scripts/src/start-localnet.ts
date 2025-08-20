import { execSync } from 'child_process'
import path from 'path'
import { getRepoRoot, SPLICE_VERSION } from './utils.js'

const args = process.argv.slice(2)
const command = args[0]

const rootDir = getRepoRoot()
const LOCALNET_DIR = path.join(rootDir, '.localnet/docker-compose/localnet')

const composeBase = [
    'docker',
    'compose',
    '--env-file',
    `${LOCALNET_DIR}/compose.env`,
    '--env-file',
    `${LOCALNET_DIR}/env/common.env`,
    '-f',
    `${LOCALNET_DIR}/compose.yaml`,
    '-f',
    `${LOCALNET_DIR}/resource-constraints.yaml`,
    '--profile',
    'sv',
    '--profile',
    'app-provider',
    '--profile',
    'app-user',
]

// Set IMAGE_TAG env variable to SPLICE_VERSION
const env = { ...process.env, IMAGE_TAG: SPLICE_VERSION }

if (command === 'start') {
    execSync([...composeBase, 'up', '-d'].join(' '), { stdio: 'inherit', env })
} else if (command === 'stop') {
    execSync([...composeBase, 'down', '-v'].join(' '), {
        stdio: 'inherit',
        env,
    })
} else {
    console.error('Usage: start-localnet.ts <start|stop>')
    process.exit(1)
}
