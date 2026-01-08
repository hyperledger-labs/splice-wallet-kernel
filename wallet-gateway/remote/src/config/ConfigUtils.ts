// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { readFileSync, existsSync } from 'fs'
import { Config, configSchema } from './Config.js'

export class ConfigUtils {
    static loadConfigFile(filePath: string): Config {
        if (existsSync(filePath)) {
            const config = configSchema.parse(
                JSON.parse(readFileSync(filePath, 'utf-8'))
            )

            /**
             * Perform extra config validation beyond schema validation.
             * We want to enforce the following constraints:
             *
             * 1. IDP IDs are unique
             * 2. Network IDs are unique
             * 3. Each Network's identityProviderId maps to an existing IDP (in config)
             * 4. Each Network's auth method is compatible with its IDP type
             */
            const duplicateIdpId = hasDuplicateElement(
                config.store.idps.map((idp) => idp.id)
            )
            if (duplicateIdpId) {
                throw new Error(
                    `Non-unique IDP IDs found in config file: ${duplicateIdpId}`
                )
            }

            const duplicateNetworkId = hasDuplicateElement(
                config.store.networks.map((network) => network.id)
            )
            if (duplicateNetworkId) {
                throw new Error(
                    `Non-unique Network IDs found in config file: ${duplicateNetworkId}`
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
    for (const network of config.store.networks) {
        const idp = config.store.idps.find(
            (idp) => idp.id === network.identityProviderId
        )

        if (typeof idp === 'undefined') {
            return { networkId: network.id, idpId: network.identityProviderId }
        }
    }
}

const SUPPORTED_IDP_METHODS = {
    self_signed: ['self_signed'],
    oauth: ['authorization_code', 'client_credentials'],
}

function validateNetworkAuthMethods(
    config: Config
): { networkId: string; invalidAuthMethod: string } | undefined {
    for (const network of config.store.networks) {
        const idp = config.store.idps.find(
            (idp) => idp.id === network.identityProviderId
        )!

        if (!SUPPORTED_IDP_METHODS[idp.type].includes(network.auth.method)) {
            return {
                networkId: network.id,
                invalidAuthMethod: network.auth.method,
            }
        }
    }
}

interface Urls {
    serviceUrl: string
    publicUrl: string
    dappApiUrl: string
}

export const deriveUrls = (config: Config, port?: number): Urls => {
    const serviceUrl = `http://localhost:${port || config.server.port}`
    const publicUrl = config.kernel.publicUrl || serviceUrl

    const dappApiUrl = `${publicUrl}${config.server.dappPath}`
    return { dappApiUrl, publicUrl, serviceUrl }
}
