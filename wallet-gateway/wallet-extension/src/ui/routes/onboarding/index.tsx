// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/onboarding/')({
    beforeLoad: () => {
        throw redirect({ to: '/onboarding/password' })
    },
})
