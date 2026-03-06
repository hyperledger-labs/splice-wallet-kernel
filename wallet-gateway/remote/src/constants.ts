// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export const WALLET_DISABLED_REASON = {
    NO_SIGNING_PROVIDER_MATCHED: 'no signing provider matched',
    // Used for participant wallets if participant node got reset, and now has a different namespace than the internal party.
    PARTICIPANT_NAMESPACE_CHANGED: 'participant namespace changed',
    TRANSACTION_FAILED: 'transaction failed',
    TRANSACTION_REJECTED: 'transaction rejected',
}
