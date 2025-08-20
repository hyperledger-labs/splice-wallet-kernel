import type { AuthContext } from '@splice/core-wallet-auth'

// Augments the global `Express` namespace
declare global {
    namespace Express {
        interface Request {
            authContext?: AuthContext | undefined
        }
    }
}
