// Node cannot resolve subdomain.localhost, therefore add the following mapping to your /etc/hosts
// 127.0.0.1   scan.localhost
export const LOCALNET_SCAN_API_URL = new URL(
    'http://scan.localhost:4000/api/scan'
)
export const LOCALNET_REGISTRY_API_URL = new URL('http://scan.localhost:4000')
