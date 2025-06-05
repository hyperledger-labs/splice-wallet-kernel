import buildController from './rpc-gen/index.js'

export const dappController = buildController({
    addNetwork: async (params) => null,
    allocateParty: async (params) =>
        Promise.resolve({ partyId: 'default-party-id' }),
    connect: async () => Promise.resolve({ chainId: 'default-chain-id' }),
    darsAvailable: async () => Promise.resolve({ dars: ['default-dar'] }),
    ledgerApi: async (params) =>
        Promise.resolve({ response: 'default-response' }),
    prepareExecute: async (params) => null,
    prepareReturn: async (params) => Promise.resolve({}),
    removeParty: async (params) => Promise.resolve({}),
    sign: async (params) =>
        Promise.resolve({
            signature: 'default-signature',
            party: 'default-party',
            signedBy: 'default-signed-by',
        }),
})
