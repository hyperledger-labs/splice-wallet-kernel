// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from 'react'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import { DappSDK } from '@canton-network/dapp-sdk'
import {
    reportHash,
    signReport,
    signReportWithWallet,
    type Report,
    type Signature,
} from '../../report.ts'
import { describeError } from '../../tests/helpers.ts'

/**
 * The signature is never embedded in the report; it is handed back as its own
 * value to offer as a detached `.sig` download.
 */
export function useReportSigning(options: {
    runActiveRef: RefObject<AbortController | null>
    signingActiveRef: RefObject<boolean>
    importingActiveRef: RefObject<boolean>
    report: Report | undefined
    setSignature: Dispatch<SetStateAction<Signature | undefined>>
    setError: Dispatch<SetStateAction<string>>
}) {
    const {
        runActiveRef,
        signingActiveRef,
        importingActiveRef,
        report,
        setSignature,
    } = options
    const [signing, setSigning] = useState(false)
    const [privateKey, setPrivateKey] = useState('')
    const [hash, setHash] = useState('')

    useEffect(() => {
        if (!report) return
        let cancelled = false
        void reportHash(report).then((digest) => {
            if (!cancelled) setHash(digest)
        })
        return () => {
            cancelled = true
        }
    }, [report])

    async function importPrivateKeyFile(file: File) {
        setPrivateKey(await file.text())
    }

    function clearPrivateKey() {
        setPrivateKey('')
    }

    async function signWithWallet() {
        if (
            !report ||
            runActiveRef.current ||
            signingActiveRef.current ||
            importingActiveRef.current
        )
            return
        signingActiveRef.current = true
        setSigning(true)
        options.setError('')
        const sdk = new DappSDK()
        try {
            await sdk.init()
            const connection = await sdk.connect()
            if (!connection.isConnected)
                throw new Error('Signing wallet did not connect')
            setSignature(await signReportWithWallet(report, sdk))
        } catch (caught) {
            options.setError(describeError(caught))
        } finally {
            signingActiveRef.current = false
            setSigning(false)
        }
    }

    async function signIfConfigured(next: Report): Promise<void> {
        if (!privateKey) return
        setSignature(await signReport(next, privateKey))
    }

    return {
        signing,
        privateKey,
        hash,
        importPrivateKeyFile,
        clearPrivateKey,
        signWithWallet,
        signIfConfigured,
    }
}
