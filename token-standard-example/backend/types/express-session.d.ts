import 'express-session'

declare module 'express-session' {
    interface SessionData {
        sessionToken?: string
        party?: string
        userId?: string
        login?: string
    }
}
