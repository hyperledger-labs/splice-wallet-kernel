// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { fail } from 'k6'
import type { ScenarioName, ThresholdConfig } from './types'

const DEFAULT_CONFIG: ThresholdConfig = {
    scenarios: {
        smoke: { executor: 'constant-vus', vus: 2, duration: '30s' },
        load: {
            executor: 'ramping-vus',
            stages: [
                { duration: '1m', target: 20 },
                { duration: '2m', target: 20 },
                { duration: '30s', target: 0 },
            ],
        },
        stress: {
            executor: 'ramping-vus',
            stages: [
                { duration: '30s', target: 20 },
                { duration: '1m', target: 50 },
                { duration: '30s', target: 0 },
            ],
        },
    },
    thresholds: {
        checks: ['rate>0.99'],
        http_req_failed: ['rate<0.01'],
        'http_req_duration{endpoint_group:system}': ['p(95)<500'],
        'http_req_duration{endpoint_group:userApi}': ['p(95)<1500'],
        'http_req_duration{endpoint_group:dappApi}': ['p(95)<2000'],
    },
}

function parseThresholdConfig(raw: string): ThresholdConfig {
    let parsed: unknown
    try {
        parsed = JSON.parse(raw)
    } catch (error) {
        fail(`Invalid THRESHOLDS_FILE JSON: ${String(error)}`)
    }

    if (!parsed || typeof parsed !== 'object') {
        fail('THRESHOLDS_FILE must contain a JSON object')
    }

    const candidate = parsed as Partial<ThresholdConfig>
    if (!candidate.scenarios || !candidate.thresholds) {
        fail(
            'THRESHOLDS_FILE must include top-level "scenarios" and "thresholds" keys'
        )
    }

    return candidate as ThresholdConfig
}

export function loadThresholdConfig(): ThresholdConfig {
    const path = __ENV.THRESHOLDS_FILE
    if (!path) return DEFAULT_CONFIG

    const raw = open(path)
    return parseThresholdConfig(raw)
}

export function resolveScenarioName(): ScenarioName {
    const candidate = (__ENV.SCENARIO ?? 'smoke') as ScenarioName
    if (
        candidate === 'smoke' ||
        candidate === 'load' ||
        candidate === 'stress'
    ) {
        return candidate
    }
    fail(`Invalid SCENARIO value "${candidate}"`)
}
