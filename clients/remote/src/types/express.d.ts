import type { AuthContext } from 'core-wallet-auth'

// Augments the global `Express` namespace
declare global {
    namespace Express {
        interface Request {
            authContext?: AuthContext | undefined
        }
    }
}
