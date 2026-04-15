// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    Toast,
    ToastMessageType,
} from '@canton-network/core-wallet-ui-components'
export const showToast = (
    title: string,
    message: string,
    type: ToastMessageType
): void => {
    const toast = new Toast()
    toast.title = title
    toast.message = message
    toast.type = type
    document.body.appendChild(toast)
}
