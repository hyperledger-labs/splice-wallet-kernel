// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { LogAdapter } from '../types'
import { SdkLogger } from '../logger' // eslint-disable-line @typescript-eslint/no-unused-vars -- for JSDoc only

/**
 * CustomLogAdapter allows users to provide their own logging implementation.
 *
 * This adapter can be passed to {@link SdkLogger.create} to enable custom log handling logic,
 * such as integrating with third-party logging services or frameworks.
 *
 * @example
 * // Create a logger with a custom log function
 * const customAdapter = new CustomLogAdapter((level, ctx, message) => {
 *   // Custom log logic here
 * });
 * const logger = new SdkLogger(customAdapter);
 * logger.info({}, 'Custom log message');
 */
export default class CustomLogAdapter implements LogAdapter {
    public readonly log: LogAdapter['log']

    /**
     * @param logFunction The custom log function to use for all log levels.
     */
    constructor(logFunction: LogAdapter['log']) {
        this.log = logFunction
    }
}
