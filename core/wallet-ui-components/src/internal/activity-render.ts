// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html, nothing } from 'lit'

export function renderCopyableValue(
    label: string,
    value: string | null | undefined,
    copyLabel: string
) {
    const resolvedValue = value || 'N/A'

    return html`
        <section class="field">
            <div class="detail-row">
                <h2 class="label small fw-semibold text-body-secondary mb-0">
                    ${label}
                </h2>
                <div class="detail-value">
                    <p class="value mb-0 text-body">${resolvedValue}</p>
                    ${
                        value
                            ? html`
                                  <wg-copy-button
                                      .value=${value}
                                      .label=${copyLabel}
                                  ></wg-copy-button>
                              `
                            : nothing
                    }
                </div>
            </div>
        </section>
    `
}
