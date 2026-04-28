// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Multi-synchronizer localnet participant configuration.
 *
 * Port layout (PARTICIPANT_JSON_API_PORT_SUFFIX = 975):
 *   2975 — P1 app-user     : global + app-synchronizer (Alice)
 *   3975 — P2 app-provider : global + app-synchronizer (Bob)
 *   4975 — P3 sv           : global only               (TradingApp)
 *
 * TODO: Once Splice is upgraded to 0.6.0 remove this file and the
 * bundled .dar files from this folder (they will be in the standard
 * localnet bundle).
 */

// P2 app-provider JSON API (3 + PARTICIPANT_JSON_API_PORT_SUFFIX 975)
export const LOCALNET_BOB_LEDGER_URL = new URL('http://localhost:3975')

// P3 sv JSON API (4 + PARTICIPANT_JSON_API_PORT_SUFFIX 975)
export const LOCALNET_TRADING_APP_LEDGER_URL = new URL('http://localhost:4975')
