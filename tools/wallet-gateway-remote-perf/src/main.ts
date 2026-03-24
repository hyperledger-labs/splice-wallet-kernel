// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { check } from 'k6'
import type { Options } from 'k6/options'
import { Counter } from 'k6/metrics'
import { buildSystemEndpoints } from './endpoints/system'
import { buildUserApiEndpoints } from './endpoints/user-api'
import { buildDappApiEndpoints } from './endpoints/dapp-api'
import { loadThresholdConfig, resolveScenarioName } from './config'
import type { EndpointSpec } from './types'

const baseUrl = (__ENV.BASE_URL ?? 'http://localhost:3001').replace(/\/$/, '')
const userPath = __ENV.USER_PATH ?? '/api/v0/user'
const dappPath = __ENV.DAPP_PATH ?? '/api/v0/dapp'
const runId =
    __ENV.RUN_ID ??
    `run-${new Date()
        .toISOString()
        .replace(/[^0-9]/g, '')
        .slice(0, 14)}`

const thresholdConfig = loadThresholdConfig()
const scenarioName = resolveScenarioName()
const endpointErrors = new Counter('endpoint_errors')
const endpointSkipped = new Counter('endpoint_skipped')

const endpoints: EndpointSpec[] = [
    ...buildSystemEndpoints({ baseUrl, runId }),
    ...buildUserApiEndpoints({ baseUrl, userPath, runId }),
    ...buildDappApiEndpoints({ baseUrl, dappPath, runId }),
]

const selectedScenario = thresholdConfig.scenarios[scenarioName]

export const options: Options = {
    scenarios: {
        main: {
            executor: selectedScenario.executor,
            ...(selectedScenario.vus !== undefined && {
                vus: selectedScenario.vus,
            }),
            ...(selectedScenario.duration && {
                duration: selectedScenario.duration,
            }),
            ...(selectedScenario.stages && {
                stages: selectedScenario.stages,
            }),
        },
    },
    thresholds: thresholdConfig.thresholds,
}

export default function () {
    const index = (__ITER + (__VU - 1)) % endpoints.length
    const endpoint = endpoints[index]
    const response = endpoint.execute()

    if (!response) {
        endpointSkipped.add(1, endpoint.tags)
        return
    }

    const ok = check(
        response,
        {
            'response is < 500': (r) => r.status < 500,
        },
        endpoint.tags
    )

    if (!ok) {
        endpointErrors.add(1, endpoint.tags)
    }
}

export function handleSummary(data: unknown) {
    const outputPath = __ENV.SUMMARY_JSON
    if (outputPath) {
        return {
            [outputPath]: JSON.stringify(data, null, 2),
        }
    }
    return {}
}
