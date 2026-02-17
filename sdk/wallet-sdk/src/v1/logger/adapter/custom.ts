// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { LogAdapter } from '../types'

export default class CustomLogAdapter implements LogAdapter {
    public readonly log: LogAdapter['log']

    constructor(logFunction: LogAdapter['log']) {
        this.log = logFunction
    }
}
