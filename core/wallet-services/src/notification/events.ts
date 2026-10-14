// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Events scoped to a user (e.g. wallet/account changes). They are emitted on
 * the notifier keyed by the user ID and broadcast to all of that user's sessions.
 */
export const USER_SCOPED_EVENTS = ['accountsChanged'] as const

/**
 * Events scoped to a session (e.g. transaction progress, connection status).
 * They are emitted on the notifier keyed by the session ID and delivered only
 * to the session that originated them.
 */
export const SESSION_SCOPED_EVENTS = [
    'connected',
    'statusChanged',
    'txChanged',
    'messageSignature',
] as const

/**
 * Internal, session-scoped control event: the session was terminated by the
 * Wallet Gateway. It is not forwarded to clients; instead it tears down the
 * client's subscription and closes its transport.
 */
export const LOGOUT_EVENT = 'logout'

export type UserScopedEvent = (typeof USER_SCOPED_EVENTS)[number]
export type SessionScopedEvent = (typeof SESSION_SCOPED_EVENTS)[number]

/** Events delivered to dApp clients (CIP-103 provider events). */
export type DappNotificationEvent = UserScopedEvent | SessionScopedEvent
