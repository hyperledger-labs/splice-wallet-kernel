// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { readFileSync, existsSync } from 'fs'
import { type Config, type RawConfig, rawConfigSchema } from './Config.js'
import { Env } from '../env.js'
import { resolveAuthIdentityProviderId } from '@canton-network/core-wallet-auth'

export class ConfigUtils {
    static loadConfigFile(filePath: string): Config {
        if (existsSync(filePath)) {
            const rawConfig = rawConfigSchema.parse(
                JSON.parse(readFileSync(filePath, 'utf-8'))
            )

            const config = resolveRawConfig(rawConfig)

            /**
             * Perform extra config validation beyond schema validation.
             * We want to enforce the following constraints:
             *
             * 1. IDP IDs are unique
             * 2. Network IDs are unique
             * 3. Self-issued network audiences are unique
             * 4. Each Network's identityProviderId maps to an existing IDP (in config)
             * 5. Each Network's auth method is compatible with its IDP type
             */
            const duplicateIdpId = hasDuplicateElement(
                config.bootstrap.idps.map((idp) => idp.id)
            )
            if (duplicateIdpId) {
                throw new Error(
                    `Non-unique IDP IDs found in config file: ${duplicateIdpId}`
                )
            }

            const duplicateNetworkId = hasDuplicateElement(
                config.bootstrap.networks.map((network) => network.id)
            )
            if (duplicateNetworkId) {
                throw new Error(
                    `Non-unique Network IDs found in config file: ${duplicateNetworkId}`
                )
            }

            const duplicateSelfIssuedAudience = hasDuplicateElement(
                config.bootstrap.networks
                    .filter((network) => network.auth.method === 'self_issued')
                    .map((network) => network.auth.audience)
            )
            if (duplicateSelfIssuedAudience) {
                throw new Error(
                    `Non-unique self-issued audience found in config file: ${duplicateSelfIssuedAudience}`
                )
            }

            const invalidMapping = validateNetworkToIdpMapping(config)
            if (invalidMapping) {
                throw new Error(
                    `Network ${invalidMapping.networkId} references unknown Identity Provider ID ${invalidMapping.idpId}`
                )
            }

            const invalidAuthMethod = validateNetworkAuthMethods(config)
            if (invalidAuthMethod) {
                throw new Error(
                    `Network ${invalidAuthMethod.networkId} has invalid auth method ${invalidAuthMethod.invalidAuthMethod} for its Identity Provider`
                )
            }

            return config
        } else {
            throw new Error("Supplied file path doesn't exist " + filePath)
        }
    }
}

type RawNetworkAuth = NonNullable<
    RawConfig['bootstrap']['networks'][number]['adminAuth']
>
type NetworkAuth = NonNullable<
    Config['bootstrap']['networks'][number]['adminAuth']
>

// The Wallet Gateway can accept adminAuth secrets from environment variables.
// However, the store expects strings. This function resolves the config from env vars
function resolveRawNetworkAuth(n: RawNetworkAuth): NetworkAuth {
    if (n.method === 'authorization_code' || n.method === 'self_issued') {
        return n
    }

    if ('clientSecret' in n) {
        return n
    } else {
        const { clientSecretEnv, ...rest } = n
        const clientSecret = Env.get(clientSecretEnv, { required: true })
        return {
            ...rest,
            clientSecret,
        }
    }
}

function resolvePostgressPassword(s: RawConfig['store']): Config['store'] {
    if (s.connection.type !== 'postgres') {
        return s
    }

    if ('password' in s.connection) {
        return s
    } else {
        const { passwordEnv, ...rest } = s.connection
        const password = Env.get(passwordEnv, { required: true })
        return {
            ...s,
            connection: {
                ...rest,
                password,
            },
        }
    }
}

function resolveRawConfig(rawConfig: RawConfig): Config {
    const rawNetworks = rawConfig.bootstrap.networks
    const networks: Config['bootstrap']['networks'] = rawNetworks.map((n) => {
        return {
            ...n,
            auth: resolveRawNetworkAuth(n.auth),
            adminAuth: n.adminAuth
                ? resolveRawNetworkAuth(n.adminAuth)
                : undefined,
            serviceAccountAuth: n.serviceAccountAuth
                ? resolveRawNetworkAuth(n.serviceAccountAuth)
                : undefined,
        }
    })

    const store: Config['store'] = resolvePostgressPassword(rawConfig.store)

    const signingStore: Config['signingStore'] = resolvePostgressPassword(
        rawConfig.signingStore
    )

    return {
        ...rawConfig,
        store,
        signingStore,
        bootstrap: {
            ...rawConfig.bootstrap,
            networks,
        },
    }
}

function hasDuplicateElement(list: string[]): string | undefined {
    let duplicate: string | undefined
    list.forEach((item, i) => {
        if (list.indexOf(item) !== i && duplicate === undefined) {
            duplicate = item
        }
    })
    return duplicate
}

function validateNetworkToIdpMapping(
    config: Config
): { networkId: string; idpId: string } | undefined {
    for (const network of config.bootstrap.networks) {
        const authConfigurations = [
            network.auth,
            network.adminAuth,
            network.serviceAccountAuth,
        ].filter((auth) => auth !== undefined)
        const idpIds = new Set([
            network.identityProviderId,
            ...authConfigurations.flatMap((auth) =>
                auth.method === 'client_credentials' && auth.identityProviderId
                    ? [auth.identityProviderId]
                    : []
            ),
        ])

        for (const idpId of idpIds) {
            const idp = config.bootstrap.idps.find((idp) => idp.id === idpId)

            if (typeof idp === 'undefined') {
                return { networkId: network.id, idpId }
            }
        }
    }
}

const SUPPORTED_IDP_METHODS = {
    self_signed: ['self_signed'],
    self_issued: ['self_issued'],
    oauth: ['authorization_code', 'client_credentials'],
}

function validateNetworkAuthMethods(
    config: Config
): { networkId: string; invalidAuthMethod: string } | undefined {
    for (const network of config.bootstrap.networks) {
        const networkAuthIdpId = resolveAuthIdentityProviderId(
            network.auth,
            network.identityProviderId
        )
        const networkAuthIdp = config.bootstrap.idps.find(
            (idp) => idp.id === networkAuthIdpId
        )!

        if (
            !SUPPORTED_IDP_METHODS[networkAuthIdp.type].includes(
                network.auth.method
            )
        ) {
            return {
                networkId: network.id,
                invalidAuthMethod: network.auth.method,
            }
        }

        for (const auth of [network.adminAuth, network.serviceAccountAuth]) {
            if (
                auth?.method === 'client_credentials' &&
                auth.identityProviderId
            ) {
                const idp = config.bootstrap.idps.find(
                    (idp) => idp.id === auth.identityProviderId
                )!
                if (idp.type !== 'oauth') {
                    return {
                        networkId: network.id,
                        invalidAuthMethod: auth.method,
                    }
                }
            }
        }
    }
}

interface Urls {
    serviceUrl: string
    publicUrl: string
    dappApiUrl: string
    userApiUrl: string
}

// Strips duplicate slashes from a URL, except for the protocol part (e.g., "http://")
function stripDuplicateSlashes(path: string): string {
    return path.replace(/(https?:\/\/)|(\/)+/g, '$1$2')
}

export const deriveUrls = (config: Config, port?: number): Urls => {
    const serviceUrl = `http://localhost:${port || config.server.port}`
    const publicUrl = config.kernel.publicUrl || serviceUrl

    const dappApiUrl = stripDuplicateSlashes(
        `${publicUrl}/${config.server.dappPath}`
    )

    const userApiUrl = stripDuplicateSlashes(
        `${publicUrl}/${config.server.userPath}`
    )

    return { dappApiUrl, userApiUrl, publicUrl, serviceUrl }
}
