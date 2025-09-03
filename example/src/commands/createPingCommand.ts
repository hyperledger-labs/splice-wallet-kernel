// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
// Corresponds to the built-in AdminWorkflows DAR every participant initializes with
export const createPingCommand = (party: string) => ({
    commands: [
        {
            CreateCommand: {
                templateId: '#AdminWorkflows:Canton.Internal.Ping:Ping',
                createArguments: {
                    id: `my-test-${new Date().getTime()}`,
                    initiator: party,
                    responder: party,
                },
            },
        },
    ],
})
