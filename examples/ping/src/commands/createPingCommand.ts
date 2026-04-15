// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// Corresponds to the built-in canton-builtin-admin-workflow-ping DAR every participant initializes with

const templateId =
    '#canton-builtin-admin-workflow-ping:Canton.Internal.Ping:Ping'

export const createPingCommand = (party: string) => {
    return {
        commands: [
            {
                CreateCommand: {
                    templateId: templateId,
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
    return {
        commands: [
            {
                ExerciseCommand: {
                    templateId: templateId,
                    choice: 'Respond',
                    contractId: `${contractId}`,
                    choiceArgument: {},
                },
            },
        ],
    }
}
