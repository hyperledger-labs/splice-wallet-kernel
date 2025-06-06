import buildController from './rpc-gen/index.js'

export const dappController = buildController({
    connect: async () =>
        Promise.resolve({
            chainId: 'default-chain-id',
            userUrl: 'http://default-user-url.com',
        }),
    darsAvailable: async () => Promise.resolve({ dars: ['default-dar'] }),
    ledgerApi: async (params) =>
        Promise.resolve({ response: 'default-response' }),
    prepareExecute: async (params) => null,
    prepareReturn: async (params) => Promise.resolve({}),
})
