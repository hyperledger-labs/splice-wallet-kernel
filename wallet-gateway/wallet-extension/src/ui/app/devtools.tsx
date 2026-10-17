// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { TanStackDevtools } from '@tanstack/react-devtools'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'

// Loaded only in development, through a lazy import in routes/__root.tsx.
// Default export so React.lazy can load it.
export default function Devtools() {
    return (
        <TanStackDevtools
            config={{ hideUntilHover: true }}
            plugins={[
                {
                    name: 'TanStack Router',
                    render: <TanStackRouterDevtoolsPanel />,
                },
                {
                    name: 'TanStack Query',
                    render: <ReactQueryDevtoolsPanel />,
                },
            ]}
        />
    )
}
