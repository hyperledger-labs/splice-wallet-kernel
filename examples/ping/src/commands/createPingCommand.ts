// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// Corresponds to the built-in canton-builtin-admin-workflow-ping DAR every participant initializes with

export const createPingCommand = (party: string) => {
    const packageName = 'canton-builtin-admin-workflow-ping'
    return {
        commands: [
            {
                CreateCommand: {
                    templateId: `#${packageName}:Canton.Internal.Ping:Ping`,
                    createArguments: {
                        id: `my-test-${new Date().getTime()}`,
                        initiator: party,
                        responder: party,
                    },
                },
            },
        ],
    }
}

export const exercisePongCommand = (contractId: string) => {
    const packageName = 'canton-builtin-admin-workflow-ping'
    return {
        commands: [
            {
                ExerciseCommand: {
                    templateId: `#${packageName}.Canton.Internal.Ping:Ping`,
                    choice: 'Respond',
                    contractId: `${contractId}`,
                    choiceArgument: {},
                },
            },
        ],
    }
}
