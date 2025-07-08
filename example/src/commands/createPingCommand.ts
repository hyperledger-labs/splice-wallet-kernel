// Corresponds to the built-in AdminWorkflows DAR every participant initializes with
const PACKAGE_ID =
    '2a38b963f6abf45b76c702f9700bfd9060555872af915ef7f8f68795e2c831bd'

export const createPingCommand = (party: string) => ({
    commands: [
        {
            CreateCommand: {
                templateId: `${PACKAGE_ID}:Canton.Internal.Ping:Ping`,
                createArguments: {
                    id: 'my-test',
                    initiator: party,
                    responder: party,
                },
            },
        },
    ],
})
