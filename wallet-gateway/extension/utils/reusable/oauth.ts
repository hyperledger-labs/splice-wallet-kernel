// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    fetchOidcDiscovery,
    oidcTokenResponseSchema,
    parseIdpResponse,
} from '@canton-network/core-wallet-auth'

const PKCE_CODE_VERIFIER_LENGTH = 64

const toBase64Url = (bytes: Uint8Array): string => {
    const binary = String.fromCharCode(...bytes)
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '')
}

const createPkcePair = async (): Promise<{
    verifier: string
    challenge: string
}> => {
    const verifierBytes = crypto.getRandomValues(
        new Uint8Array(PKCE_CODE_VERIFIER_LENGTH)
    )
    const verifier = toBase64Url(verifierBytes)

    const digest = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(verifier)
    )

    return {
        verifier,
        challenge: toBase64Url(new Uint8Array(digest)),
    }
}

interface OAuthAuthorizeParams {
    configUrl: string
    clientId: string
    audience: string
    redirectUri: string
    scope: string
}

export const buildAuthorization = async (
    params: OAuthAuthorizeParams
): Promise<string> => {
    const { configUrl, clientId, audience, scope, redirectUri } = params

    const config = await fetchOidcDiscovery(configUrl)
    if (!config.authorization_endpoint) {
        throw new Error('OIDC discovery document has no authorization_endpoint')
    }

    const statePayload = {
        configUrl,
        clientId,
        audience,
        stateId: crypto.randomUUID(),
    }

    const { verifier, challenge } = await createPkcePair()
    sessionStorage.setItem(`oauth-pkce-${statePayload.stateId}`, verifier)

    const urlParams = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        nonce: crypto.randomUUID(),
        scope,
        audience,
        state: btoa(JSON.stringify(statePayload)),
        code_challenge: challenge,
        code_challenge_method: 'S256',
    })

    return `${config.authorization_endpoint}?${urlParams.toString()}`
}

export const fetchToken = async (
    callbackUri: string | undefined,
    redirectUri: string
): Promise<string> => {
    if (!callbackUri) {
        throw new Error('Missing callback URI')
    }

    const url = new URL(callbackUri)
    const code = url.searchParams.get('code')
    const encodedState = url.searchParams.get('state')

    if (!code || !encodedState) {
        throw new Error('Missing state or code')
    }

    const state = JSON.parse(atob(encodedState))
    const pkceVerifier = sessionStorage.getItem(`oauth-pkce-${state.stateId}`)

    if (!pkceVerifier) {
        throw new Error('Missing PKCE verifier for OAuth callback state')
    }

    sessionStorage.removeItem(`oauth-pkce-${state.stateId}`)

    const config = await fetchOidcDiscovery(state.configUrl)
    if (!config.token_endpoint) {
        throw new Error('OIDC discovery document has no token_endpoint')
    }

    const res = await fetch(config.token_endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: state.clientId,
            audience: state.audience,
            code_verifier: pkceVerifier,
        }),
    })

    if (!res.ok) {
        throw new Error(`OAuth token request failed: ${res.status}`)
    }
    const tokenResponse = parseIdpResponse(
        oidcTokenResponseSchema,
        await res.json(),
        'OAuth token response'
    )

    return tokenResponse.access_token
}
