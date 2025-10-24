// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

type Tags = 'latest' | 'devnet' | 'mainnet'
type Artifacts = 'canton' | 'splice' | 'splice_specs'
type ArtifactVersion = { version: string; hash: string }

type SupportedVersions = Record<Artifacts, Record<Tags, ArtifactVersion>> & {
    localnet: ArtifactVersion
}

/**
 * To update the versions consistently (pending scripted automation):
 *
 * 1. For the 'latest' tags (or localnet), simply use the most recent versions available. Otherwise, continue...
 *
 * 2. Look up the Splice versions published at https://sync.global/sv-network/
 * 3. [splice + splice_specs]: Update the version and hash for Splice
 * 4. [canton]: Look up the Canton version associated with the Splice version in the OSS Splice Repo:
 *       https://github.com/hyperledger-labs/splice/blob/release-line-0.4.16/nix/canton-sources.json
 *
 */
const SUPPORTED_VERSIONS: SupportedVersions = {
    // Only 1 localnet version, doesnt make sense to follow Splice here
    localnet: {
        version: '',
        hash: '',
    },
    canton: {
        latest: {
            version: '3.4.0-snapshot.20250922.16951.0.v1eb3f268',
            hash: 'e0f59a7b5015b56479ef4786662c5935a0fee9ac803465bb0f70bdc6c3bf4dff',
        },
        devnet: {
            version: '3.4.0-snapshot.20250922.16951.0.v1eb3f268',
            hash: 'e0f59a7b5015b56479ef4786662c5935a0fee9ac803465bb0f70bdc6c3bf4dff',
        },
        mainnet: {
            version: '3.3.0-snapshot.20250910.16087.0.v82d35a4d',
            hash: '43c89d9833886fc68cac4951ba1959b7f6cc5269abfff1ba5129859203aa8cd3',
        },
    },
    splice: {
        latest: {
            version: '0.4.19',
            hash: '',
        },
        devnet: {
            version: '0.4.18',
            hash: '',
        },
        mainnet: {
            version: '0.4.16',
            hash: '',
        },
    },
    splice_specs: {
        latest: {
            version: '0.4.19',
            hash: '',
        },
        devnet: {
            version: '0.4.18',
            hash: '',
        },
        mainnet: {
            version: '0.4.16',
            hash: '',
        },
    },
}

export function getVersion(
    artifact: Artifacts | 'localnet',
    tag: Tags
): ArtifactVersion | undefined {
    if (artifact === 'localnet') {
        return SUPPORTED_VERSIONS.localnet
    }
    return SUPPORTED_VERSIONS[artifact]?.[tag]
}
