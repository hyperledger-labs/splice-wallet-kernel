// Node cannot resolve subdomain.localhost, therefore add the following mapping to your /etc/hosts
// 127.0.0.1   scan.localhost
// 127.0.0.1   wallet.localhost
export const LOCALNET_VALIDATOR_URL = new URL(
    'http://wallet.localhost:2000/api/validator'
)
export const LOCALNET_REGISTRY_API_URL = new URL(
    LOCALNET_VALIDATOR_URL.href + '/v0/scan-proxy'
)
