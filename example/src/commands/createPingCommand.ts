// Corresponds to the built-in AdminWorkflows DAR every participant initializes with
export const createPingCommand = (party: string) => ({
    commands: [
        {
            CreateCommand: {
                templateId: '#AdminWorkflows:Canton.Internal.Ping:Ping',
                createArguments: {
                    id: 'my-test',
                    initiator: party,
                    responder: party,
                },
            },
        },
    ],
})
