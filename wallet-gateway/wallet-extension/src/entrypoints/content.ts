// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineContentScript } from 'wxt/utils/define-content-script'
import { startContent } from '@/content'

export default defineContentScript({
    matches: ['file://*/*', 'http://*/*', 'https://*/*'],
    main: startContent,
})
