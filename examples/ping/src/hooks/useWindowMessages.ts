// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from 'react'
import { WalletEvent } from '@canton-network/core-types'

export type WindowMessageEvent = {
    type: WalletEvent | string
    data: object
    origin: string
    timestamp: Date
}

export function useWindowMessages() {
    const [messages, setMessages] = useState<WindowMessageEvent[]>([])

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const messageType =
                event.data.type &&
                Object.values(WalletEvent).includes(event.data.type)
                    ? event.data.type
                    : event.data.type || 'unknown'

            setMessages((prev) => [
                {
                    type: messageType,
                    data: event.data,
                    origin: event.origin,
                    timestamp: new Date(),
                },
                ...prev,
            ])
        }

        window.addEventListener('message', handleMessage)

        return () => {
            window.removeEventListener('message', handleMessage)
        }
    }, [])

    return messages
}
