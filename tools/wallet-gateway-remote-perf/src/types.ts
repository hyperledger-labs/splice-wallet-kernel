// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { RefinedResponse } from 'k6/http'

export type ScenarioName = 'smoke' | 'load' | 'stress'
export type EndpointGroup = 'system' | 'userApi' | 'dappApi'

export interface EndpointSpec {
    name: string
    group: EndpointGroup
    path: string
    method: 'GET' | 'POST'
    tags: Record<string, string>
    execute: () => RefinedResponse<'text'> | null
}

export interface ScenarioConfig {
    executor: 'constant-vus' | 'ramping-vus'
    vus?: number
    duration?: string
    stages?: Array<{ duration: string; target: number }>
}

export interface ThresholdConfig {
    scenarios: Record<ScenarioName, ScenarioConfig>
    thresholds: Record<string, string[]>
}
