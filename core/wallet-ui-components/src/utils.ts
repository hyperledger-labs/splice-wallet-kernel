// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { CSSResult, CSSResultGroup } from 'lit'

export function cssToString(styles: CSSResultGroup): string {
    if (Array.isArray(styles)) {
        return styles.reduce((acc, style) => acc + cssToString(style), '')
    } else if (styles instanceof CSSResult) {
        return styles.cssText
    } else {
        return ''
    }
}
