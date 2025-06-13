#!/usr/bin/env bash
set -euo pipefail

function on_exit() {
    yarn pm2 kill
}

trap on_exit SIGINT SIGTERM EXIT

yarn pm2 start ecosystem.config.js --env development
yarn pm2 logs
