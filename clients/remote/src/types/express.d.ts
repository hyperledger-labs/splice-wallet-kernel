import type { AuthContext } from '@canton-network/core-wallet-auth'

// Augments the global `Express` namespace
declare global {
    namespace Express {
        interface Request {
            authContext?: AuthContext | undefined
        }
    }
}
