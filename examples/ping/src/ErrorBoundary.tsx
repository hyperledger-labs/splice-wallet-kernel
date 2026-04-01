// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }

type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
    state: State = { error: null }

    static getDerivedStateFromError(error: Error): State {
        return { error }
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[example-ping] UI error:', error, info.componentStack)
    }

    render() {
        if (this.state.error) {
            return (
                <div style={{ padding: '1rem' }}>
                    <h1>Example dApp</h1>
                    <p className="error">
                        <b>UI error:</b> <i>{this.state.error.message}</i>
                    </p>
                    <p>
                        The shell stayed mounted so you can still use the rest
                        of the page after fixing the underlying issue or{' '}
                        <button
                            type="button"
                            onClick={() => this.setState({ error: null })}
                        >
                            dismiss
                        </button>
                        .
                    </p>
                </div>
            )
        }
        return this.props.children
    }
}
