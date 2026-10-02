/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_PAYMASTER_API_URL?: string
    readonly VITE_PAYMASTER_PARTY_ID?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
