// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute } from '@tanstack/react-router'
import { LoginPage } from '@/ui/features/auth'

export const Route = createFileRoute('/_unlocked/login')({
    component: LoginPage,
})
