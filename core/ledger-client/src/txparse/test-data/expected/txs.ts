// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export default [
    {
        events: [],
        offset: 0,
        recordTime: '1971-01-01T00:00:00Z',
        synchronizerId: 'sync::normalized',
        updateId: 'update-0',
    },
    {
        events: [],
        offset: 1,
        recordTime: '1971-01-01T00:00:01Z',
        synchronizerId: 'sync::normalized',
        updateId: 'update-1',
    },
    {
        events: [],
        offset: 2,
        recordTime: '1971-01-01T00:00:02Z',
        synchronizerId: 'sync::normalized',
        updateId: 'update-2',
    },
    {
        events: [],
        offset: 3,
        recordTime: '1971-01-01T00:00:03Z',
        synchronizerId: 'sync::normalized',
        updateId: 'update-3',
    },
    {
        events: [
            {
                label: {
                    burnAmount: '0',
                    meta: {
                        values: {},
                    },
                    mintAmount: '0',
                    reason: 'token-standard-transfer-description',
                    sender: 'aliceValidator::normalized',
                    tokenStandardChoice: null,
                    type: 'TransferIn',
                },
                lockedHoldingsChange: {
                    archives: [],
                    creates: [],
                },
                lockedHoldingsChangeSummary: {
                    amountChange: '0',
                    inputAmount: '0',
                    numInputs: 0,
                    numOutputs: 0,
                    outputAmount: '0',
                },
                transferInstruction: {
                    meta: null,
                    originalInstructionCid: null,
                    status: {
                        before: null,
                    },
                },
                unlockedHoldingsChange: {
                    archives: [],
                    creates: [
                        {
                            amount: '200.0000000000',
                            contractId: '16',
                            instrumentId: {
                                admin: 'dso::normalized',
                                id: 'Amulet',
                            },
                            lock: null,
                            meta: {
                                values: {
                                    'amulet.splice.lfdecentralizedtrust.org/created-in-round':
                                        '1',
                                    'amulet.splice.lfdecentralizedtrust.org/rate-per-round':
                                        '0.00380518',
                                },
                            },
                            owner: 'alice::normalized',
                        },
                    ],
                },
                unlockedHoldingsChangeSummary: {
                    amountChange: '200',
                    inputAmount: '0',
                    numInputs: 0,
                    numOutputs: 1,
                    outputAmount: '200',
                },
            },
        ],
        offset: 4,
        recordTime: '1971-01-01T00:00:04Z',
        synchronizerId: 'sync::normalized',
        updateId: 'update-4',
    },
    {
        events: [
            {
                label: {
                    burnAmount: '13',
                    meta: {
                        values: {},
                    },
                    mintAmount: '0',
                    reason: null,
                    receiverAmounts: [
                        {
                            amount: '100',
                            receiver: 'aliceValidator::normalized',
                        },
                    ],
                    tokenStandardChoice: {
                        choiceArgument: {
                            expectedAdmin: 'dso::normalized',
                            extraArgs: {
                                context: {
                                    values: {
                                        'amulet-rules': {
                                            tag: 'AV_ContractId',
                                            value: '1',
                                        },
                                        'open-round': {
                                            tag: 'AV_ContractId',
                                            value: '9',
                                        },
                                        'transfer-preapproval': {
                                            tag: 'AV_ContractId',
                                            value: '21',
                                        },
                                    },
                                },
                                meta: {
                                    values: {},
                                },
                            },
                            transfer: {
                                amount: '100.0000000000',
                                executeBefore: '2025-06-18T00:00:00.000000Z',
                                inputHoldingCids: ['16'],
                                instrumentId: {
                                    admin: 'dso::normalized',
                                    id: 'Amulet',
                                },
                                meta: {
                                    values: {},
                                },
                                receiver: 'aliceValidator::normalized',
                                requestedAt: '2025-06-18T00:00:00.000000Z',
                                sender: 'alice::normalized',
                            },
                        },
                        exerciseResult: {
                            meta: {
                                values: {
                                    'splice.lfdecentralizedtrust.org/burned':
                                        '13.0',
                                },
                            },
                            output: {
                                tag: 'TransferInstructionResult_Completed',
                                value: {
                                    receiverHoldingCids: ['22'],
                                },
                            },
                            senderChangeCids: ['23'],
                        },
                        name: 'TransferFactory_Transfer',
                    },
                    type: 'TransferOut',
                },
                lockedHoldingsChange: {
                    archives: [],
                    creates: [],
                },
                lockedHoldingsChangeSummary: {
                    amountChange: '0',
                    inputAmount: '0',
                    numInputs: 0,
                    numOutputs: 0,
                    outputAmount: '0',
                },
                transferInstruction: {
                    meta: null,
                    originalInstructionCid: null,
                    status: {
                        before: null,
                    },
                    transfer: {
                        amount: '100.0000000000',
                        executeBefore: '2025-06-18T00:00:00.000000Z',
                        inputHoldingCids: ['16'],
                        instrumentId: {
                            admin: 'dso::normalized',
                            id: 'Amulet',
                        },
                        meta: {
                            values: {},
                        },
                        receiver: 'aliceValidator::normalized',
                        requestedAt: '2025-06-18T00:00:00.000000Z',
                        sender: 'alice::normalized',
                    },
                },
                unlockedHoldingsChange: {
                    archives: [
                        {
                            amount: '200.0000000000',
                            contractId: '16',
                            instrumentId: {
                                admin: 'dso::normalized',
                                id: 'Amulet',
                            },
                            lock: null,
                            meta: {
                                values: {
                                    'amulet.splice.lfdecentralizedtrust.org/created-in-round':
                                        '1',
                                    'amulet.splice.lfdecentralizedtrust.org/rate-per-round':
                                        '0.00380518',
                                },
                            },
                            owner: 'alice::normalized',
                        },
                    ],
                    creates: [
                        {
                            amount: '87.0000000000',
                            contractId: '23',
                            instrumentId: {
                                admin: 'dso::normalized',
                                id: 'Amulet',
                            },
                            lock: null,
                            meta: {
                                values: {
                                    'amulet.splice.lfdecentralizedtrust.org/created-in-round':
                                        '1',
                                    'amulet.splice.lfdecentralizedtrust.org/rate-per-round':
                                        '0.00380518',
                                },
                            },
                            owner: 'alice::normalized',
                        },
                    ],
                },
                unlockedHoldingsChangeSummary: {
                    amountChange: '-113',
                    inputAmount: '200',
                    numInputs: 1,
                    numOutputs: 1,
                    outputAmount: '87',
                },
            },
        ],
        offset: 5,
        recordTime: '1971-01-01T00:00:05Z',
        synchronizerId: 'sync::normalized',
        updateId: 'update-5',
    },
    {
        events: [
            {
                label: {
                    burnAmount: '12.1',
                    meta: {
                        values: {},
                    },
                    mintAmount: '0',
                    reason: null,
                    receiverAmounts: [
                        {
                            amount: '10',
                            receiver: 'aliceValidator::normalized',
                        },
                    ],
                    tokenStandardChoice: null,
                    type: 'TransferOut',
                },
                lockedHoldingsChange: {
                    archives: [],
                    creates: [],
                },
                lockedHoldingsChangeSummary: {
                    amountChange: '0',
                    inputAmount: '0',
                    numInputs: 0,
                    numOutputs: 0,
                    outputAmount: '0',
                },
                transferInstruction: {
                    meta: null,
                    originalInstructionCid: null,
                    status: {
                        before: null,
                    },
                },
                unlockedHoldingsChange: {
                    archives: [
                        {
                            amount: '87.0000000000',
                            contractId: '23',
                            instrumentId: {
                                admin: 'dso::normalized',
                                id: 'Amulet',
                            },
                            lock: null,
                            meta: {
                                values: {
                                    'amulet.splice.lfdecentralizedtrust.org/created-in-round':
                                        '1',
                                    'amulet.splice.lfdecentralizedtrust.org/rate-per-round':
                                        '0.00380518',
                                },
                            },
                            owner: 'alice::normalized',
                        },
                    ],
                    creates: [
                        {
                            amount: '64.9000000000',
                            contractId: '26',
                            instrumentId: {
                                admin: 'dso::normalized',
                                id: 'Amulet',
                            },
                            lock: null,
                            meta: {
                                values: {
                                    'amulet.splice.lfdecentralizedtrust.org/created-in-round':
                                        '1',
                                    'amulet.splice.lfdecentralizedtrust.org/rate-per-round':
                                        '0.00380518',
                                },
                            },
                            owner: 'alice::normalized',
                        },
                    ],
                },
                unlockedHoldingsChangeSummary: {
                    amountChange: '-22.1',
                    inputAmount: '87',
                    numInputs: 1,
                    numOutputs: 1,
                    outputAmount: '64.9',
                },
            },
        ],
        offset: 6,
        recordTime: '1971-01-01T00:00:06Z',
        synchronizerId: 'sync::normalized',
        updateId: 'update-6',
    },
    {
        events: [
            {
                label: {
                    burnAmount: '0',
                    meta: {
                        values: {},
                    },
                    mintAmount: '6000',
                    reason: 'tapped faucet',
                    tokenStandardChoice: null,
                    type: 'Mint',
                },
                lockedHoldingsChange: {
                    archives: [],
                    creates: [],
                },
                lockedHoldingsChangeSummary: {
                    amountChange: '0',
                    inputAmount: '0',
                    numInputs: 0,
                    numOutputs: 0,
                    outputAmount: '0',
                },
                transferInstruction: null,
                unlockedHoldingsChange: {
                    archives: [],
                    creates: [
                        {
                            amount: '6000.0000000000',
                            contractId: '30',
                            instrumentId: {
                                admin: 'dso::normalized',
                                id: 'Amulet',
                            },
                            lock: null,
                            meta: {
                                values: {
                                    'amulet.splice.lfdecentralizedtrust.org/created-in-round':
                                        '1',
                                    'amulet.splice.lfdecentralizedtrust.org/rate-per-round':
                                        '0.00380518',
                                },
                            },
                            owner: 'alice::normalized',
                        },
                    ],
                },
                unlockedHoldingsChangeSummary: {
                    amountChange: '6000',
                    inputAmount: '0',
                    numInputs: 0,
                    numOutputs: 1,
                    outputAmount: '6000',
                },
            },
        ],
        offset: 7,
        recordTime: '1971-01-01T00:00:07Z',
        synchronizerId: 'sync::normalized',
        updateId: 'update-7',
    },
    {
        events: [
            {
                label: {
                    burnAmount: '13',
                    meta: {
                        values: {},
                    },
                    mintAmount: '0',
                    reason: null,
                    tokenStandardChoice: {
                        choiceArgument: {
                            expectedAdmin: 'dso::normalized',
                            extraArgs: {
                                context: {
                                    values: {
                                        'amulet-rules': {
                                            tag: 'AV_ContractId',
                                            value: '1',
                                        },
                                        'open-round': {
                                            tag: 'AV_ContractId',
                                            value: '9',
                                        },
                                    },
                                },
                                meta: {
                                    values: {},
                                },
                            },
                            transfer: {
                                amount: '1000.0000000000',
                                executeBefore: '2025-06-18T00:00:00.000000Z',
                                inputHoldingCids: ['26', '30'],
                                instrumentId: {
                                    admin: 'dso::normalized',
                                    id: 'Amulet',
                                },
                                meta: {
                                    values: {},
                                },
                                receiver: 'bob::normalized',
                                requestedAt: '2025-06-18T00:00:00.000000Z',
                                sender: 'alice::normalized',
                            },
                        },
                        exerciseResult: {
                            meta: {
                                values: {
                                    'splice.lfdecentralizedtrust.org/burned':
                                        '13.0',
                                },
                            },
                            output: {
                                tag: 'TransferInstructionResult_Pending',
                                value: {
                                    transferInstructionCid: '31',
                                },
                            },
                            senderChangeCids: ['32'],
                        },
                        name: 'TransferFactory_Transfer',
                    },
                    type: 'MergeSplit',
                },
                lockedHoldingsChange: {
                    archives: [],
                    creates: [
                        {
                            amount: '1064.0015220800',
                            contractId: '33',
                            instrumentId: {
                                admin: 'dso::normalized',
                                id: 'Amulet',
                            },
                            lock: {
                                context: "transfer to 'bob::normalized'",
                                expiresAfter: null,
                                expiresAt: '2025-06-18T00:00:00.000000Z',
                                holders: ['dso::normalized'],
                            },
                            meta: {
                                values: {
                                    'amulet.splice.lfdecentralizedtrust.org/created-in-round':
                                        '1',
                                    'amulet.splice.lfdecentralizedtrust.org/rate-per-round':
                                        '0.00380518',
                                },
                            },
                            owner: 'alice::normalized',
                        },
                    ],
                },
                lockedHoldingsChangeSummary: {
                    amountChange: '1064.00152208',
                    inputAmount: '0',
                    numInputs: 0,
                    numOutputs: 1,
                    outputAmount: '1064.00152208',
                },
                transferInstruction: {
                    meta: null,
                    originalInstructionCid: null,
                    status: {
                        before: null,
                    },
                    transfer: {
                        amount: '1000.0000000000',
                        executeBefore: '2025-06-18T00:00:00.000000Z',
                        inputHoldingCids: ['26', '30'],
                        instrumentId: {
                            admin: 'dso::normalized',
                            id: 'Amulet',
                        },
                        meta: {
                            values: {},
                        },
                        receiver: 'bob::normalized',
                        requestedAt: '2025-06-18T00:00:00.000000Z',
                        sender: 'alice::normalized',
                    },
                },
                unlockedHoldingsChange: {
                    archives: [
                        {
                            amount: '64.9000000000',
                            contractId: '26',
                            instrumentId: {
                                admin: 'dso::normalized',
                                id: 'Amulet',
                            },
                            lock: null,
                            meta: {
                                values: {
                                    'amulet.splice.lfdecentralizedtrust.org/created-in-round':
                                        '1',
                                    'amulet.splice.lfdecentralizedtrust.org/rate-per-round':
                                        '0.00380518',
                                },
                            },
                            owner: 'alice::normalized',
                        },
                        {
                            amount: '6000.0000000000',
                            contractId: '30',
                            instrumentId: {
                                admin: 'dso::normalized',
                                id: 'Amulet',
                            },
                            lock: null,
                            meta: {
                                values: {
                                    'amulet.splice.lfdecentralizedtrust.org/created-in-round':
                                        '1',
                                    'amulet.splice.lfdecentralizedtrust.org/rate-per-round':
                                        '0.00380518',
                                },
                            },
                            owner: 'alice::normalized',
                        },
                    ],
                    creates: [
                        {
                            amount: '4987.8984779200',
                            contractId: '32',
                            instrumentId: {
                                admin: 'dso::normalized',
                                id: 'Amulet',
                            },
                            lock: null,
                            meta: {
                                values: {
                                    'amulet.splice.lfdecentralizedtrust.org/created-in-round':
                                        '1',
                                    'amulet.splice.lfdecentralizedtrust.org/rate-per-round':
                                        '0.00380518',
                                },
                            },
                            owner: 'alice::normalized',
                        },
                    ],
                },
                unlockedHoldingsChangeSummary: {
                    amountChange: '-1077.00152208',
                    inputAmount: '6064.9',
                    numInputs: 2,
                    numOutputs: 1,
                    outputAmount: '4987.89847792',
                },
            },
        ],
        offset: 8,
        recordTime: '1971-01-01T00:00:08Z',
        synchronizerId: 'sync::normalized',
        updateId: 'update-8',
    },
    {
        events: [
            {
                label: {
                    burnAmount: '13',
                    meta: {
                        values: {},
                    },
                    mintAmount: '0',
                    reason: null,
                    tokenStandardChoice: {
                        choiceArgument: {
                            expectedAdmin: 'dso::normalized',
                            extraArgs: {
                                context: {
                                    values: {
                                        'amulet-rules': {
                                            tag: 'AV_ContractId',
                                            value: '1',
                                        },
                                        'open-round': {
                                            tag: 'AV_ContractId',
                                            value: '9',
                                        },
                                    },
                                },
                                meta: {
                                    values: {},
                                },
                            },
                            transfer: {
                                amount: '1000.0000000000',
                                executeBefore: '2025-06-18T00:00:00.000000Z',
                                inputHoldingCids: ['32'],
                                instrumentId: {
                                    admin: 'dso::normalized',
                                    id: 'Amulet',
                                },
                                meta: {
                                    values: {},
                                },
                                receiver: 'bob::normalized',
                                requestedAt: '2025-06-18T00:00:00.000000Z',
                                sender: 'alice::normalized',
                            },
                        },
                        exerciseResult: {
                            meta: {
                                values: {
                                    'splice.lfdecentralizedtrust.org/burned':
                                        '13.0',
                                },
                            },
                            output: {
                                tag: 'TransferInstructionResult_Pending',
                                value: {
                                    transferInstructionCid: '36',
                                },
                            },
                            senderChangeCids: ['37'],
                        },
                        name: 'TransferFactory_Transfer',
                    },
                    type: 'MergeSplit',
                },
                lockedHoldingsChange: {
                    archives: [],
                    creates: [
                        {
                            amount: '1064.0015220800',
                            contractId: '38',
                            instrumentId: {
                                admin: 'dso::normalized',
                                id: 'Amulet',
                            },
                            lock: {
                                context: "transfer to 'bob::normalized'",
                                expiresAfter: null,
                                expiresAt: '2025-06-18T00:00:00.000000Z',
                                holders: ['dso::normalized'],
                            },
                            meta: {
                                values: {
                                    'amulet.splice.lfdecentralizedtrust.org/created-in-round':
                                        '1',
                                    'amulet.splice.lfdecentralizedtrust.org/rate-per-round':
                                        '0.00380518',
                                },
                            },
                            owner: 'alice::normalized',
                        },
                    ],
                },
                lockedHoldingsChangeSummary: {
                    amountChange: '1064.00152208',
                    inputAmount: '0',
                    numInputs: 0,
                    numOutputs: 1,
                    outputAmount: '1064.00152208',
                },
                transferInstruction: {
                    meta: null,
                    originalInstructionCid: null,
                    status: {
                        before: null,
                    },
                    transfer: {
                        amount: '1000.0000000000',
                        executeBefore: '2025-06-18T00:00:00.000000Z',
                        inputHoldingCids: ['32'],
                        instrumentId: {
                            admin: 'dso::normalized',
                            id: 'Amulet',
                        },
                        meta: {
                            values: {},
                        },
                        receiver: 'bob::normalized',
                        requestedAt: '2025-06-18T00:00:00.000000Z',
                        sender: 'alice::normalized',
                    },
                },
                unlockedHoldingsChange: {
                    archives: [
                        {
                            amount: '4987.8984779200',
                            contractId: '32',
                            instrumentId: {
                                admin: 'dso::normalized',
                                id: 'Amulet',
                            },
                            lock: null,
                            meta: {
                                values: {
                                    'amulet.splice.lfdecentralizedtrust.org/created-in-round':
                                        '1',
                                    'amulet.splice.lfdecentralizedtrust.org/rate-per-round':
                                        '0.00380518',
                                },
                            },
                            owner: 'alice::normalized',
                        },
                    ],
                    creates: [
                        {
                            amount: '3910.8969558400',
                            contractId: '37',
                            instrumentId: {
                                admin: 'dso::normalized',
                                id: 'Amulet',
                            },
                            lock: null,
                            meta: {
                                values: {
                                    'amulet.splice.lfdecentralizedtrust.org/created-in-round':
                                        '1',
                                    'amulet.splice.lfdecentralizedtrust.org/rate-per-round':
                                        '0.00380518',
                                },
                            },
                            owner: 'alice::normalized',
                        },
                    ],
                },
                unlockedHoldingsChangeSummary: {
                    amountChange: '-1077.00152208',
                    inputAmount: '4987.89847792',
                    numInputs: 1,
                    numOutputs: 1,
                    outputAmount: '3910.89695584',
                },
            },
        ],
        offset: 9,
        recordTime: '1971-01-01T00:00:09Z',
        synchronizerId: 'sync::normalized',
        updateId: 'update-9',
    },
    {
        events: [
            {
                label: {
                    burnAmount: '13',
                    meta: {
                        values: {},
                    },
                    mintAmount: '0',
                    reason: null,
                    tokenStandardChoice: {
                        choiceArgument: {
                            expectedAdmin: 'dso::normalized',
                            extraArgs: {
                                context: {
                                    values: {
                                        'amulet-rules': {
                                            tag: 'AV_ContractId',
                                            value: '1',
                                        },
                                        'open-round': {
                                            tag: 'AV_ContractId',
                                            value: '9',
                                        },
                                    },
                                },
                                meta: {
                                    values: {},
                                },
                            },
                            transfer: {
                                amount: '1000.0000000000',
                                executeBefore: '2025-06-18T00:00:00.000000Z',
                                inputHoldingCids: ['37'],
                                instrumentId: {
                                    admin: 'dso::normalized',
                                    id: 'Amulet',
                                },
                                meta: {
                                    values: {},
                                },
                                receiver: 'bob::normalized',
                                requestedAt: '2025-06-18T00:00:00.000000Z',
                                sender: 'alice::normalized',
                            },
                        },
                        exerciseResult: {
                            meta: {
                                values: {
                                    'splice.lfdecentralizedtrust.org/burned':
                                        '13.0',
                                },
                            },
                            output: {
                                tag: 'TransferInstructionResult_Pending',
                                value: {
                                    transferInstructionCid: '41',
                                },
                            },
                            senderChangeCids: ['42'],
                        },
                        name: 'TransferFactory_Transfer',
                    },
                    type: 'MergeSplit',
                },
                lockedHoldingsChange: {
                    archives: [],
                    creates: [
                        {
                            amount: '1064.0015220800',
                            contractId: '43',
                            instrumentId: {
                                admin: 'dso::normalized',
                                id: 'Amulet',
                            },
                            lock: {
                                context: "transfer to 'bob::normalized'",
                                expiresAfter: null,
                                expiresAt: '2025-06-18T00:00:00.000000Z',
                                holders: ['dso::normalized'],
                            },
                            meta: {
                                values: {
                                    'amulet.splice.lfdecentralizedtrust.org/created-in-round':
                                        '1',
                                    'amulet.splice.lfdecentralizedtrust.org/rate-per-round':
                                        '0.00380518',
                                },
                            },
                            owner: 'alice::normalized',
                        },
                    ],
                },
                lockedHoldingsChangeSummary: {
                    amountChange: '1064.00152208',
                    inputAmount: '0',
                    numInputs: 0,
                    numOutputs: 1,
                    outputAmount: '1064.00152208',
                },
                transferInstruction: {
                    meta: null,
                    originalInstructionCid: null,
                    status: {
                        before: null,
                    },
                    transfer: {
                        amount: '1000.0000000000',
                        executeBefore: '2025-06-18T00:00:00.000000Z',
                        inputHoldingCids: ['37'],
                        instrumentId: {
                            admin: 'dso::normalized',
                            id: 'Amulet',
                        },
                        meta: {
                            values: {},
                        },
                        receiver: 'bob::normalized',
                        requestedAt: '2025-06-18T00:00:00.000000Z',
                        sender: 'alice::normalized',
                    },
                },
                unlockedHoldingsChange: {
                    archives: [
                        {
                            amount: '3910.8969558400',
                            contractId: '37',
                            instrumentId: {
                                admin: 'dso::normalized',
                                id: 'Amulet',
                            },
                            lock: null,
                            meta: {
                                values: {
                                    'amulet.splice.lfdecentralizedtrust.org/created-in-round':
                                        '1',
                                    'amulet.splice.lfdecentralizedtrust.org/rate-per-round':
                                        '0.00380518',
                                },
                            },
                            owner: 'alice::normalized',
                        },
                    ],
                    creates: [
                        {
                            amount: '2833.8954337600',
                            contractId: '42',
                            instrumentId: {
                                admin: 'dso::normalized',
                                id: 'Amulet',
                            },
                            lock: null,
                            meta: {
                                values: {
                                    'amulet.splice.lfdecentralizedtrust.org/created-in-round':
                                        '1',
                                    'amulet.splice.lfdecentralizedtrust.org/rate-per-round':
                                        '0.00380518',
                                },
                            },
                            owner: 'alice::normalized',
                        },
                    ],
                },
                unlockedHoldingsChangeSummary: {
                    amountChange: '-1077.00152208',
                    inputAmount: '3910.89695584',
                    numInputs: 1,
                    numOutputs: 1,
                    outputAmount: '2833.89543376',
                },
            },
        ],
        offset: 10,
        recordTime: '1971-01-01T00:00:10Z',
        synchronizerId: 'sync::normalized',
        updateId: 'update-10',
    },
    {
        events: [
            {
                label: {
                    burnAmount: '13',
                    meta: {
                        values: {},
                    },
                    mintAmount: '0',
                    reason: null,
                    tokenStandardChoice: {
                        choiceArgument: {
                            expectedAdmin: 'dso::normalized',
                            extraArgs: {
                                context: {
                                    values: {
                                        'amulet-rules': {
                                            tag: 'AV_ContractId',
                                            value: '1',
                                        },
                                        'open-round': {
                                            tag: 'AV_ContractId',
                                            value: '9',
                                        },
                                    },
                                },
                                meta: {
                                    values: {},
                                },
                            },
                            transfer: {
                                amount: '1000.0000000000',
                                executeBefore: '2025-06-18T00:00:00.000000Z',
                                inputHoldingCids: ['42'],
                                instrumentId: {
                                    admin: 'dso::normalized',
                                    id: 'Amulet',
                                },
                                meta: {
                                    values: {},
                                },
                                receiver: 'bob::normalized',
                                requestedAt: '2025-06-18T00:00:00.000000Z',
                                sender: 'alice::normalized',
                            },
                        },
                        exerciseResult: {
                            meta: {
                                values: {
                                    'splice.lfdecentralizedtrust.org/burned':
                                        '13.0',
                                },
                            },
                            output: {
                                tag: 'TransferInstructionResult_Pending',
                                value: {
                                    transferInstructionCid: '46',
                                },
                            },
                            senderChangeCids: ['47'],
                        },
                        name: 'TransferFactory_Transfer',
                    },
                    type: 'MergeSplit',
                },
                lockedHoldingsChange: {
                    archives: [],
                    creates: [
                        {
                            amount: '1064.0015220800',
                            contractId: '48',
                            instrumentId: {
                                admin: 'dso::normalized',
                                id: 'Amulet',
                            },
                            lock: {
                                context: "transfer to 'bob::normalized'",
                                expiresAfter: null,
                                expiresAt: '2025-06-18T00:00:00.000000Z',
                                holders: ['dso::normalized'],
                            },
                            meta: {
                                values: {
                                    'amulet.splice.lfdecentralizedtrust.org/created-in-round':
                                        '1',
                                    'amulet.splice.lfdecentralizedtrust.org/rate-per-round':
                                        '0.00380518',
                                },
                            },
                            owner: 'alice::normalized',
                        },
                    ],
                },
                lockedHoldingsChangeSummary: {
                    amountChange: '1064.00152208',
                    inputAmount: '0',
                    numInputs: 0,
                    numOutputs: 1,
                    outputAmount: '1064.00152208',
                },
                transferInstruction: {
                    meta: null,
                    originalInstructionCid: null,
                    status: {
                        before: null,
                    },
                    transfer: {
                        amount: '1000.0000000000',
                        executeBefore: '2025-06-18T00:00:00.000000Z',
                        inputHoldingCids: ['42'],
                        instrumentId: {
                            admin: 'dso::normalized',
                            id: 'Amulet',
                        },
                        meta: {
                            values: {},
                        },
                        receiver: 'bob::normalized',
                        requestedAt: '2025-06-18T00:00:00.000000Z',
                        sender: 'alice::normalized',
                    },
                },
                unlockedHoldingsChange: {
                    archives: [
                        {
                            amount: '2833.8954337600',
                            contractId: '42',
                            instrumentId: {
                                admin: 'dso::normalized',
                                id: 'Amulet',
                            },
                            lock: null,
                            meta: {
                                values: {
                                    'amulet.splice.lfdecentralizedtrust.org/created-in-round':
                                        '1',
                                    'amulet.splice.lfdecentralizedtrust.org/rate-per-round':
                                        '0.00380518',
                                },
                            },
                            owner: 'alice::normalized',
                        },
                    ],
                    creates: [
                        {
                            amount: '1756.8939116800',
                            contractId: '47',
                            instrumentId: {
                                admin: 'dso::normalized',
                                id: 'Amulet',
                            },
                            lock: null,
                            meta: {
                                values: {
                                    'amulet.splice.lfdecentralizedtrust.org/created-in-round':
                                        '1',
                                    'amulet.splice.lfdecentralizedtrust.org/rate-per-round':
                                        '0.00380518',
                                },
                            },
                            owner: 'alice::normalized',
                        },
                    ],
                },
                unlockedHoldingsChangeSummary: {
                    amountChange: '-1077.00152208',
                    inputAmount: '2833.89543376',
                    numInputs: 1,
                    numOutputs: 1,
                    outputAmount: '1756.89391168',
                },
            },
        ],
        offset: 11,
        recordTime: '1971-01-01T00:00:11Z',
        synchronizerId: 'sync::normalized',
        updateId: 'update-11',
    },
    {
        events: [
            {
                label: {
                    burnAmount: '13',
                    meta: {
                        values: {},
                    },
                    mintAmount: '0',
                    reason: null,
                    tokenStandardChoice: {
                        choiceArgument: {
                            expectedAdmin: 'dso::normalized',
                            extraArgs: {
                                context: {
                                    values: {
                                        'amulet-rules': {
                                            tag: 'AV_ContractId',
                                            value: '1',
                                        },
                                        'open-round': {
                                            tag: 'AV_ContractId',
                                            value: '9',
                                        },
                                    },
                                },
                                meta: {
                                    values: {},
                                },
                            },
                            transfer: {
                                amount: '1000.0000000000',
                                executeBefore: '2025-06-18T00:00:00.000000Z',
                                inputHoldingCids: ['47'],
                                instrumentId: {
                                    admin: 'dso::normalized',
                                    id: 'Amulet',
                                },
                                meta: {
                                    values: {},
                                },
                                receiver: 'bob::normalized',
                                requestedAt: '2025-06-18T00:00:00.000000Z',
                                sender: 'alice::normalized',
                            },
                        },
                        exerciseResult: {
                            meta: {
                                values: {
                                    'splice.lfdecentralizedtrust.org/burned':
                                        '13.0',
                                },
                            },
                            output: {
                                tag: 'TransferInstructionResult_Pending',
                                value: {
                                    transferInstructionCid: '51',
                                },
                            },
                            senderChangeCids: ['52'],
                        },
                        name: 'TransferFactory_Transfer',
                    },
                    type: 'MergeSplit',
                },
                lockedHoldingsChange: {
                    archives: [],
                    creates: [
                        {
                            amount: '1064.0304414400',
                            contractId: '0',
                            instrumentId: {
                                admin: 'dso::normalized',
                                id: 'Amulet',
                            },
                            lock: {
                                context: "transfer to 'bob::normalized'",
                                expiresAfter: null,
                                expiresAt: '2025-06-18T00:00:00.000000Z',
                                holders: ['dso::normalized'],
                            },
                            meta: {
                                values: {
                                    'amulet.splice.lfdecentralizedtrust.org/created-in-round':
                                        '1',
                                    'amulet.splice.lfdecentralizedtrust.org/rate-per-round':
                                        '0.00380518',
                                },
                            },
                            owner: 'alice::normalized',
                        },
                    ],
                },
                lockedHoldingsChangeSummary: {
                    amountChange: '1064.03044144',
                    inputAmount: '0',
                    numInputs: 0,
                    numOutputs: 1,
                    outputAmount: '1064.03044144',
                },
                transferInstruction: {
                    meta: null,
                    originalInstructionCid: null,
                    status: {
                        before: null,
                    },
                    transfer: {
                        amount: '1000.0000000000',
                        executeBefore: '2025-06-18T00:00:00.000000Z',
                        inputHoldingCids: ['47'],
                        instrumentId: {
                            admin: 'dso::normalized',
                            id: 'Amulet',
                        },
                        meta: {
                            values: {},
                        },
                        receiver: 'bob::normalized',
                        requestedAt: '2025-06-18T00:00:00.000000Z',
                        sender: 'alice::normalized',
                    },
                },
                unlockedHoldingsChange: {
                    archives: [
                        {
                            amount: '1756.8939116800',
                            contractId: '47',
                            instrumentId: {
                                admin: 'dso::normalized',
                                id: 'Amulet',
                            },
                            lock: null,
                            meta: {
                                values: {
                                    'amulet.splice.lfdecentralizedtrust.org/created-in-round':
                                        '1',
                                    'amulet.splice.lfdecentralizedtrust.org/rate-per-round':
                                        '0.00380518',
                                },
                            },
                            owner: 'alice::normalized',
                        },
                    ],
                    creates: [
                        {
                            amount: '679.8634702400',
                            contractId: '52',
                            instrumentId: {
                                admin: 'dso::normalized',
                                id: 'Amulet',
                            },
                            lock: null,
                            meta: {
                                values: {
                                    'amulet.splice.lfdecentralizedtrust.org/created-in-round':
                                        '1',
                                    'amulet.splice.lfdecentralizedtrust.org/rate-per-round':
                                        '0.00380518',
                                },
                            },
                            owner: 'alice::normalized',
                        },
                    ],
                },
                unlockedHoldingsChangeSummary: {
                    amountChange: '-1077.03044144',
                    inputAmount: '1756.89391168',
                    numInputs: 1,
                    numOutputs: 1,
                    outputAmount: '679.86347024',
                },
            },
        ],
        offset: 12,
        recordTime: '1971-01-01T00:00:12Z',
        synchronizerId: 'sync::normalized',
        updateId: 'update-12',
    },
    {
        events: [
            {
                label: {
                    burnAmount: '22',
                    meta: {
                        values: {},
                    },
                    mintAmount: '0',
                    reason: null,
                    receiverAmounts: [
                        {
                            amount: '1000',
                            receiver: 'bob::normalized',
                        },
                    ],
                    tokenStandardChoice: {
                        choiceArgument: {
                            extraArgs: {
                                context: {
                                    values: {
                                        'amulet-rules': {
                                            tag: 'AV_ContractId',
                                            value: '1',
                                        },
                                        'expire-lock': {
                                            tag: 'AV_Bool',
                                            value: true,
                                        },
                                        'open-round': {
                                            tag: 'AV_ContractId',
                                            value: '9',
                                        },
                                    },
                                },
                                meta: {
                                    values: {},
                                },
                            },
                        },
                        exerciseResult: {
                            meta: {
                                values: {
                                    'splice.lfdecentralizedtrust.org/burned':
                                        '22.0',
                                },
                            },
                            output: {
                                tag: 'TransferInstructionResult_Completed',
                                value: {
                                    receiverHoldingCids: ['55'],
                                },
                            },
                            senderChangeCids: ['56'],
                        },
                        name: 'TransferInstruction_Accept',
                    },
                    type: 'TransferOut',
                },
                lockedHoldingsChange: {
                    archives: [
                        {
                            amount: '1064.0015220800',
                            contractId: '33',
                            instrumentId: {
                                admin: 'dso::normalized',
                                id: 'Amulet',
                            },
                            lock: {
                                context: "transfer to 'bob::normalized'",
                                expiresAfter: null,
                                expiresAt: '2025-06-18T00:00:00.000000Z',
                                holders: ['dso::normalized'],
                            },
                            meta: {
                                values: {
                                    'amulet.splice.lfdecentralizedtrust.org/created-in-round':
                                        '1',
                                    'amulet.splice.lfdecentralizedtrust.org/rate-per-round':
                                        '0.00380518',
                                },
                            },
                            owner: 'alice::normalized',
                        },
                    ],
                    creates: [],
                },
                lockedHoldingsChangeSummary: {
                    amountChange: '-1064.00152208',
                    inputAmount: '1064.00152208',
                    numInputs: 1,
                    numOutputs: 0,
                    outputAmount: '0',
                },
                transferInstruction: {
                    meta: {
                        values: {},
                    },
                    originalInstructionCid: null,
                    status: {
                        before: {
                            tag: 'TransferPendingReceiverAcceptance',
                            value: {},
                        },
                    },
                    transfer: {
                        amount: '1000.0000000000',
                        executeBefore: '2025-06-18T00:00:00.000000Z',
                        inputHoldingCids: ['33'],
                        instrumentId: {
                            admin: 'dso::normalized',
                            id: 'Amulet',
                        },
                        meta: {
                            values: {},
                        },
                        receiver: 'bob::normalized',
                        requestedAt: '2025-06-18T00:00:00.000000Z',
                        sender: 'alice::normalized',
                    },
                },
                unlockedHoldingsChange: {
                    archives: [],
                    creates: [
                        {
                            amount: '42.0015220800',
                            contractId: '56',
                            instrumentId: {
                                admin: 'dso::normalized',
                                id: 'Amulet',
                            },
                            lock: null,
                            meta: {
                                values: {
                                    'amulet.splice.lfdecentralizedtrust.org/created-in-round':
                                        '1',
                                    'amulet.splice.lfdecentralizedtrust.org/rate-per-round':
                                        '0.00380518',
                                },
                            },
                            owner: 'alice::normalized',
                        },
                    ],
                },
                unlockedHoldingsChangeSummary: {
                    amountChange: '42.00152208',
                    inputAmount: '0',
                    numInputs: 0,
                    numOutputs: 1,
                    outputAmount: '42.00152208',
                },
            },
        ],
        offset: 13,
        recordTime: '1971-01-01T00:00:13Z',
        synchronizerId: 'sync::normalized',
        updateId: 'update-13',
    },
    {
        events: [
            {
                label: {
                    burnAmount: '0',
                    meta: {
                        values: {},
                    },
                    mintAmount: '0',
                    reason: null,
                    tokenStandardChoice: {
                        choiceArgument: {
                            extraArgs: {
                                context: {
                                    values: {
                                        'amulet-rules': {
                                            tag: 'AV_ContractId',
                                            value: '1',
                                        },
                                        'expire-lock': {
                                            tag: 'AV_Bool',
                                            value: true,
                                        },
                                        'open-round': {
                                            tag: 'AV_ContractId',
                                            value: '9',
                                        },
                                    },
                                },
                                meta: {
                                    values: {},
                                },
                            },
                        },
                        exerciseResult: {
                            meta: {
                                values: {},
                            },
                            output: {
                                tag: 'TransferInstructionResult_Failed',
                                value: {},
                            },
                            senderChangeCids: ['60'],
                        },
                        name: 'TransferInstruction_Reject',
                    },
                    type: 'MergeSplit',
                },
                lockedHoldingsChange: {
                    archives: [
                        {
                            amount: '1064.0015220800',
                            contractId: '38',
                            instrumentId: {
                                admin: 'dso::normalized',
                                id: 'Amulet',
                            },
                            lock: {
                                context: "transfer to 'bob::normalized'",
                                expiresAfter: null,
                                expiresAt: '2025-06-18T00:00:00.000000Z',
                                holders: ['dso::normalized'],
                            },
                            meta: {
                                values: {
                                    'amulet.splice.lfdecentralizedtrust.org/created-in-round':
                                        '1',
                                    'amulet.splice.lfdecentralizedtrust.org/rate-per-round':
                                        '0.00380518',
                                },
                            },
                            owner: 'alice::normalized',
                        },
                    ],
                    creates: [],
                },
                lockedHoldingsChangeSummary: {
                    amountChange: '-1064.00152208',
                    inputAmount: '1064.00152208',
                    numInputs: 1,
                    numOutputs: 0,
                    outputAmount: '0',
                },
                transferInstruction: {
                    meta: {
                        values: {},
                    },
                    originalInstructionCid: null,
                    status: {
                        before: {
                            tag: 'TransferPendingReceiverAcceptance',
                            value: {},
                        },
                    },
                    transfer: {
                        amount: '1000.0000000000',
                        executeBefore: '2025-06-18T00:00:00.000000Z',
                        inputHoldingCids: ['38'],
                        instrumentId: {
                            admin: 'dso::normalized',
                            id: 'Amulet',
                        },
                        meta: {
                            values: {},
                        },
                        receiver: 'bob::normalized',
                        requestedAt: '2025-06-18T00:00:00.000000Z',
                        sender: 'alice::normalized',
                    },
                },
                unlockedHoldingsChange: {
                    archives: [],
                    creates: [
                        {
                            amount: '1064.0015220800',
                            contractId: '60',
                            instrumentId: {
                                admin: 'dso::normalized',
                                id: 'Amulet',
                            },
                            lock: null,
                            meta: {
                                values: {
                                    'amulet.splice.lfdecentralizedtrust.org/created-in-round':
                                        '1',
                                    'amulet.splice.lfdecentralizedtrust.org/rate-per-round':
                                        '0.00380518',
                                },
                            },
                            owner: 'alice::normalized',
                        },
                    ],
                },
                unlockedHoldingsChangeSummary: {
                    amountChange: '1064.00152208',
                    inputAmount: '0',
                    numInputs: 0,
                    numOutputs: 1,
                    outputAmount: '1064.00152208',
                },
            },
        ],
        offset: 14,
        recordTime: '1971-01-01T00:00:14Z',
        synchronizerId: 'sync::normalized',
        updateId: 'update-14',
    },
    {
        events: [
            {
                label: {
                    burnAmount: '0',
                    meta: {
                        values: {},
                    },
                    mintAmount: '0',
                    reason: null,
                    tokenStandardChoice: {
                        choiceArgument: {
                            extraArgs: {
                                context: {
                                    values: {
                                        'amulet-rules': {
                                            tag: 'AV_ContractId',
                                            value: '1',
                                        },
                                        'expire-lock': {
                                            tag: 'AV_Bool',
                                            value: true,
                                        },
                                        'open-round': {
                                            tag: 'AV_ContractId',
                                            value: '9',
                                        },
                                    },
                                },
                                meta: {
                                    values: {},
                                },
                            },
                        },
                        exerciseResult: {
                            meta: {
                                values: {},
                            },
                            output: {
                                tag: 'TransferInstructionResult_Failed',
                                value: {},
                            },
                            senderChangeCids: ['61'],
                        },
                        name: 'TransferInstruction_Withdraw',
                    },
                    type: 'MergeSplit',
                },
                lockedHoldingsChange: {
                    archives: [
                        {
                            amount: '1064.0015220800',
                            contractId: '43',
                            instrumentId: {
                                admin: 'dso::normalized',
                                id: 'Amulet',
                            },
                            lock: {
                                context: "transfer to 'bob::normalized'",
                                expiresAfter: null,
                                expiresAt: '2025-06-18T00:00:00.000000Z',
                                holders: ['dso::normalized'],
                            },
                            meta: {
                                values: {
                                    'amulet.splice.lfdecentralizedtrust.org/created-in-round':
                                        '1',
                                    'amulet.splice.lfdecentralizedtrust.org/rate-per-round':
                                        '0.00380518',
                                },
                            },
                            owner: 'alice::normalized',
                        },
                    ],
                    creates: [],
                },
                lockedHoldingsChangeSummary: {
                    amountChange: '-1064.00152208',
                    inputAmount: '1064.00152208',
                    numInputs: 1,
                    numOutputs: 0,
                    outputAmount: '0',
                },
                transferInstruction: {
                    meta: {
                        values: {},
                    },
                    originalInstructionCid: null,
                    status: {
                        before: {
                            tag: 'TransferPendingReceiverAcceptance',
                            value: {},
                        },
                    },
                    transfer: {
                        amount: '1000.0000000000',
                        executeBefore: '2025-06-18T00:00:00.000000Z',
                        inputHoldingCids: ['43'],
                        instrumentId: {
                            admin: 'dso::normalized',
                            id: 'Amulet',
                        },
                        meta: {
                            values: {},
                        },
                        receiver: 'bob::normalized',
                        requestedAt: '2025-06-18T00:00:00.000000Z',
                        sender: 'alice::normalized',
                    },
                },
                unlockedHoldingsChange: {
                    archives: [],
                    creates: [
                        {
                            amount: '1064.0015220800',
                            contractId: '61',
                            instrumentId: {
                                admin: 'dso::normalized',
                                id: 'Amulet',
                            },
                            lock: null,
                            meta: {
                                values: {
                                    'amulet.splice.lfdecentralizedtrust.org/created-in-round':
                                        '1',
                                    'amulet.splice.lfdecentralizedtrust.org/rate-per-round':
                                        '0.00380518',
                                },
                            },
                            owner: 'alice::normalized',
                        },
                    ],
                },
                unlockedHoldingsChangeSummary: {
                    amountChange: '1064.00152208',
                    inputAmount: '0',
                    numInputs: 0,
                    numOutputs: 1,
                    outputAmount: '1064.00152208',
                },
            },
        ],
        offset: 15,
        recordTime: '1971-01-01T00:00:15Z',
        synchronizerId: 'sync::normalized',
        updateId: 'update-15',
    },
    {
        events: [],
        offset: 16,
        recordTime: '1971-01-01T00:00:16Z',
        synchronizerId: 'sync::normalized',
        updateId: 'update-16',
    },
    {
        events: [],
        offset: 17,
        recordTime: '1971-01-01T00:00:17Z',
        synchronizerId: 'sync::normalized',
        updateId: 'update-17',
    },
    {
        events: [],
        offset: 18,
        recordTime: '1971-01-01T00:00:18Z',
        synchronizerId: 'sync::normalized',
        updateId: 'update-18',
    },
    {
        events: [],
        offset: 19,
        recordTime: '1971-01-01T00:00:19Z',
        synchronizerId: 'sync::normalized',
        updateId: 'update-19',
    },
    {
        events: [],
        offset: 20,
        recordTime: '1971-01-01T00:00:20Z',
        synchronizerId: 'sync::normalized',
        updateId: 'update-20',
    },
    {
        events: [
            {
                label: {
                    burnAmount: '0',
                    meta: {
                        values: {},
                    },
                    mintAmount: '0',
                    reason: null,
                    sender: 'bob::normalized',
                    tokenStandardChoice: {
                        choiceArgument: {
                            extraArgs: {
                                context: {
                                    values: {
                                        'amulet-rules': {
                                            tag: 'AV_ContractId',
                                            value: '1',
                                        },
                                        'expire-lock': {
                                            tag: 'AV_Bool',
                                            value: true,
                                        },
                                        'open-round': {
                                            tag: 'AV_ContractId',
                                            value: '9',
                                        },
                                    },
                                },
                                meta: {
                                    values: {},
                                },
                            },
                        },
                        exerciseResult: {
                            meta: {
                                values: {
                                    'splice.lfdecentralizedtrust.org/burned':
                                        '14.0',
                                },
                            },
                            output: {
                                tag: 'TransferInstructionResult_Completed',
                                value: {
                                    receiverHoldingCids: ['70'],
                                },
                            },
                            senderChangeCids: ['71'],
                        },
                        name: 'TransferInstruction_Accept',
                    },
                    type: 'TransferIn',
                },
                lockedHoldingsChange: {
                    archives: [],
                    creates: [],
                },
                lockedHoldingsChangeSummary: {
                    amountChange: '0',
                    inputAmount: '0',
                    numInputs: 0,
                    numOutputs: 0,
                    outputAmount: '0',
                },
                transferInstruction: {
                    meta: {
                        values: {},
                    },
                    originalInstructionCid: null,
                    status: {
                        before: {
                            tag: 'TransferPendingReceiverAcceptance',
                            value: {},
                        },
                    },
                    transfer: {
                        amount: '200.0000000000',
                        executeBefore: '2025-06-18T00:00:00.000000Z',
                        inputHoldingCids: ['63'],
                        instrumentId: {
                            admin: 'dso::normalized',
                            id: 'Amulet',
                        },
                        meta: {
                            values: {},
                        },
                        receiver: 'alice::normalized',
                        requestedAt: '2025-06-18T00:00:00.000000Z',
                        sender: 'bob::normalized',
                    },
                },
                unlockedHoldingsChange: {
                    archives: [],
                    creates: [
                        {
                            amount: '200.0000000000',
                            contractId: '70',
                            instrumentId: {
                                admin: 'dso::normalized',
                                id: 'Amulet',
                            },
                            lock: null,
                            meta: {
                                values: {
                                    'amulet.splice.lfdecentralizedtrust.org/created-in-round':
                                        '1',
                                    'amulet.splice.lfdecentralizedtrust.org/rate-per-round':
                                        '0.00380518',
                                },
                            },
                            owner: 'alice::normalized',
                        },
                    ],
                },
                unlockedHoldingsChangeSummary: {
                    amountChange: '200',
                    inputAmount: '0',
                    numInputs: 0,
                    numOutputs: 1,
                    outputAmount: '200',
                },
            },
        ],
        offset: 21,
        recordTime: '1971-01-01T00:00:21Z',
        synchronizerId: 'sync::normalized',
        updateId: 'update-21',
    },
    {
        events: [],
        offset: 22,
        recordTime: '1971-01-01T00:00:22Z',
        synchronizerId: 'sync::normalized',
        updateId: 'update-22',
    },
    {
        events: [],
        offset: 23,
        recordTime: '1971-01-01T00:00:23Z',
        synchronizerId: 'sync::normalized',
        updateId: 'update-23',
    },
    {
        events: [
            {
                label: {
                    burnAmount: '12',
                    meta: {
                        values: {},
                    },
                    mintAmount: '0',
                    reason: null,
                    tokenStandardChoice: {
                        choiceArgument: {
                            expectedAdmin: 'dso::normalized',
                            extraArgs: {
                                context: {
                                    values: {
                                        'amulet-rules': {
                                            tag: 'AV_ContractId',
                                            value: '1',
                                        },
                                        'open-round': {
                                            tag: 'AV_ContractId',
                                            value: '9',
                                        },
                                    },
                                },
                                meta: {
                                    values: {},
                                },
                            },
                            transfer: {
                                amount: '1.0000000000',
                                executeBefore: '2025-06-18T00:00:00.000000Z',
                                inputHoldingCids: [
                                    '48',
                                    '52',
                                    '56',
                                    '60',
                                    '61',
                                    '70',
                                ],
                                instrumentId: {
                                    admin: 'dso::normalized',
                                    id: 'Amulet',
                                },
                                meta: {
                                    values: {},
                                },
                                receiver: 'alice::normalized',
                                requestedAt: '2025-06-18T00:00:00.000000Z',
                                sender: 'alice::normalized',
                            },
                        },
                        exerciseResult: {
                            meta: {
                                values: {
                                    'splice.lfdecentralizedtrust.org/burned':
                                        '12.0',
                                },
                            },
                            output: {
                                tag: 'TransferInstructionResult_Completed',
                                value: {
                                    receiverHoldingCids: ['2'],
                                },
                            },
                            senderChangeCids: ['3'],
                        },
                        name: 'TransferFactory_Transfer',
                    },
                    type: 'MergeSplit',
                },
                lockedHoldingsChange: {
                    archives: [
                        {
                            amount: '1064.0015220800',
                            contractId: '48',
                            instrumentId: {
                                admin: 'dso::normalized',
                                id: 'Amulet',
                            },
                            lock: {
                                context: "transfer to 'bob::normalized'",
                                expiresAfter: null,
                                expiresAt: '2025-06-18T00:00:00.000000Z',
                                holders: ['dso::normalized'],
                            },
                            meta: {
                                values: {
                                    'amulet.splice.lfdecentralizedtrust.org/created-in-round':
                                        '1',
                                    'amulet.splice.lfdecentralizedtrust.org/rate-per-round':
                                        '0.00380518',
                                },
                            },
                            owner: 'alice::normalized',
                        },
                    ],
                    creates: [],
                },
                lockedHoldingsChangeSummary: {
                    amountChange: '-1064.00152208',
                    inputAmount: '1064.00152208',
                    numInputs: 1,
                    numOutputs: 0,
                    outputAmount: '0',
                },
                transferInstruction: {
                    meta: null,
                    originalInstructionCid: null,
                    status: {
                        before: null,
                    },
                    transfer: {
                        amount: '1.0000000000',
                        executeBefore: '2025-06-18T00:00:00.000000Z',
                        inputHoldingCids: ['48', '52', '56', '60', '61', '70'],
                        instrumentId: {
                            admin: 'dso::normalized',
                            id: 'Amulet',
                        },
                        meta: {
                            values: {},
                        },
                        receiver: 'alice::normalized',
                        requestedAt: '2025-06-18T00:00:00.000000Z',
                        sender: 'alice::normalized',
                    },
                },
                unlockedHoldingsChange: {
                    archives: [
                        {
                            amount: '679.8634702400',
                            contractId: '52',
                            instrumentId: {
                                admin: 'dso::normalized',
                                id: 'Amulet',
                            },
                            lock: null,
                            meta: {
                                values: {
                                    'amulet.splice.lfdecentralizedtrust.org/created-in-round':
                                        '1',
                                    'amulet.splice.lfdecentralizedtrust.org/rate-per-round':
                                        '0.00380518',
                                },
                            },
                            owner: 'alice::normalized',
                        },
                        {
                            amount: '42.0015220800',
                            contractId: '56',
                            instrumentId: {
                                admin: 'dso::normalized',
                                id: 'Amulet',
                            },
                            lock: null,
                            meta: {
                                values: {
                                    'amulet.splice.lfdecentralizedtrust.org/created-in-round':
                                        '1',
                                    'amulet.splice.lfdecentralizedtrust.org/rate-per-round':
                                        '0.00380518',
                                },
                            },
                            owner: 'alice::normalized',
                        },
                        {
                            amount: '1064.0015220800',
                            contractId: '60',
                            instrumentId: {
                                admin: 'dso::normalized',
                                id: 'Amulet',
                            },
                            lock: null,
                            meta: {
                                values: {
                                    'amulet.splice.lfdecentralizedtrust.org/created-in-round':
                                        '1',
                                    'amulet.splice.lfdecentralizedtrust.org/rate-per-round':
                                        '0.00380518',
                                },
                            },
                            owner: 'alice::normalized',
                        },
                        {
                            amount: '1064.0015220800',
                            contractId: '61',
                            instrumentId: {
                                admin: 'dso::normalized',
                                id: 'Amulet',
                            },
                            lock: null,
                            meta: {
                                values: {
                                    'amulet.splice.lfdecentralizedtrust.org/created-in-round':
                                        '1',
                                    'amulet.splice.lfdecentralizedtrust.org/rate-per-round':
                                        '0.00380518',
                                },
                            },
                            owner: 'alice::normalized',
                        },
                        {
                            amount: '200.0000000000',
                            contractId: '70',
                            instrumentId: {
                                admin: 'dso::normalized',
                                id: 'Amulet',
                            },
                            lock: null,
                            meta: {
                                values: {
                                    'amulet.splice.lfdecentralizedtrust.org/created-in-round':
                                        '1',
                                    'amulet.splice.lfdecentralizedtrust.org/rate-per-round':
                                        '0.00380518',
                                },
                            },
                            owner: 'alice::normalized',
                        },
                    ],
                    creates: [
                        {
                            amount: '1.0000000000',
                            contractId: '2',
                            instrumentId: {
                                admin: 'dso::normalized',
                                id: 'Amulet',
                            },
                            lock: null,
                            meta: {
                                values: {
                                    'amulet.splice.lfdecentralizedtrust.org/created-in-round':
                                        '1',
                                    'amulet.splice.lfdecentralizedtrust.org/rate-per-round':
                                        '0.00380518',
                                },
                            },
                            owner: 'alice::normalized',
                        },
                        {
                            amount: '4100.8695585600',
                            contractId: '3',
                            instrumentId: {
                                admin: 'dso::normalized',
                                id: 'Amulet',
                            },
                            lock: null,
                            meta: {
                                values: {
                                    'amulet.splice.lfdecentralizedtrust.org/created-in-round':
                                        '1',
                                    'amulet.splice.lfdecentralizedtrust.org/rate-per-round':
                                        '0.00380518',
                                },
                            },
                            owner: 'alice::normalized',
                        },
                    ],
                },
                unlockedHoldingsChangeSummary: {
                    amountChange: '1052.00152208',
                    inputAmount: '3049.86803648',
                    numInputs: 5,
                    numOutputs: 2,
                    outputAmount: '4101.86955856',
                },
            },
        ],
        offset: 24,
        recordTime: '1971-01-01T00:00:24Z',
        synchronizerId: 'sync::normalized',
        updateId: 'update-24',
    },
    {
        events: [],
        offset: 25,
        recordTime: '1971-01-01T00:00:25Z',
        synchronizerId: 'sync::normalized',
        updateId: 'update-25',
    },
    {
        events: [
            {
                label: {
                    contractId: '4',
                    meta: {
                        values: {},
                    },
                    offset: 26,
                    packageName: 'splice-token-test-dummy-holding',
                    parentChoice: 'none (root node)',
                    payload: {
                        amount: '30.0000000000',
                        instrumentId: {
                            admin: 'alice::normalized',
                            id: 'DummyHolding',
                        },
                        lock: null,
                        meta: {
                            values: {
                                test: 'test',
                            },
                        },
                        owner: 'alice::normalized',
                    },
                    templateId:
                        '#package-name:Splice.Api.Token.Test.DummyHolding:DummyHolding',
                    type: 'Create',
                },
                lockedHoldingsChange: {
                    archives: [],
                    creates: [],
                },
                lockedHoldingsChangeSummary: {
                    amountChange: '0',
                    inputAmount: '0',
                    numInputs: 0,
                    numOutputs: 0,
                    outputAmount: '0',
                },
                transferInstruction: null,
                unlockedHoldingsChange: {
                    archives: [],
                    creates: [
                        {
                            amount: '30.0000000000',
                            instrumentId: {
                                admin: 'alice::normalized',
                                id: 'DummyHolding',
                            },
                            lock: null,
                            meta: {
                                values: {
                                    test: 'test',
                                },
                            },
                            owner: 'alice::normalized',
                        },
                    ],
                },
                unlockedHoldingsChangeSummary: {
                    amountChange: '30.0000000000',
                    inputAmount: '0',
                    numInputs: 0,
                    numOutputs: 1,
                    outputAmount: '30.0000000000',
                },
            },
        ],
        offset: 26,
        recordTime: '1971-01-01T00:00:26Z',
        synchronizerId: 'sync::normalized',
        updateId: 'update-26',
    },
    {
        events: [
            {
                label: {
                    contractId: '5',
                    meta: {
                        values: {},
                    },
                    offset: 27,
                    packageName: 'splice-token-test-dummy-holding',
                    parentChoice: 'none (root node)',
                    payload: {
                        amount: '40.0000000000',
                        instrumentId: {
                            admin: 'alice::normalized',
                            id: 'DummyHolding',
                        },
                        lock: null,
                        meta: {
                            values: {
                                test: 'test',
                            },
                        },
                        owner: 'alice::normalized',
                    },
                    templateId:
                        '#package-name:Splice.Api.Token.Test.DummyHolding:DummyHolding',
                    type: 'Create',
                },
                lockedHoldingsChange: {
                    archives: [],
                    creates: [],
                },
                lockedHoldingsChangeSummary: {
                    amountChange: '0',
                    inputAmount: '0',
                    numInputs: 0,
                    numOutputs: 0,
                    outputAmount: '0',
                },
                transferInstruction: null,
                unlockedHoldingsChange: {
                    archives: [],
                    creates: [
                        {
                            amount: '40.0000000000',
                            instrumentId: {
                                admin: 'alice::normalized',
                                id: 'DummyHolding',
                            },
                            lock: null,
                            meta: {
                                values: {
                                    test: 'test',
                                },
                            },
                            owner: 'alice::normalized',
                        },
                    ],
                },
                unlockedHoldingsChangeSummary: {
                    amountChange: '40.0000000000',
                    inputAmount: '0',
                    numInputs: 0,
                    numOutputs: 1,
                    outputAmount: '40.0000000000',
                },
            },
        ],
        offset: 27,
        recordTime: '1971-01-01T00:00:27Z',
        synchronizerId: 'sync::normalized',
        updateId: 'update-27',
    },
]
