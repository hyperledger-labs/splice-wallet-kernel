// TODO: get over splice provider
const PRIMARY_PARTY =
    'party-19648470-21f1-4796-b3aa-6bb1a79a1bbe::12204f26b956ea9eba59f8fedd5c13b1f500475eacbee89b1b2fc3be086283fdd973'

// Corresponds to the built-in AdminWorkflows DAR every participant initializes with
const PACKAGE_ID =
    '2a38b963f6abf45b76c702f9700bfd9060555872af915ef7f8f68795e2c831bd'

export const createPingCommand = {
    commands: [
        {
            CreateCommand: {
                templateId: `${PACKAGE_ID}:Canton.Internal.Ping:Ping`,
                createArguments: {
                    id: 'my-test',
                    initiator: PRIMARY_PARTY,
                    responder: PRIMARY_PARTY,
                },
            },
        },
    ],
}
