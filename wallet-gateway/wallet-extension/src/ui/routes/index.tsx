// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute, redirect } from '@tanstack/react-router'

// Every page opens at `/`. Later phases pick the target from session state.
export const Route = createFileRoute('/')({
    beforeLoad: () => {
        throw redirect({ to: '/parties' })
    },
})
