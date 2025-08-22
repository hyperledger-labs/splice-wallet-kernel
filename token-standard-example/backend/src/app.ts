import express, { Request, Response, NextFunction } from 'express'
import session from 'express-session'
import cors from 'cors'
import {
    validatePartyAccess,
    fetchHoldings,
    fetchTransfers,
    fetchTransferFactories,
    LedgerCtx,
} from './service'
import { LedgerClient } from '@splice/core-ledger-client'
import pino from 'pino'

const PORT = 3333
const LEDGER_API_URL = 'http://localhost:5003/'

const ALLOWED_ORIGINS = ['http://localhost:8081']

const app = express()

app.use(express.json())

app.use(
    cors({
        origin(origin, cb) {
            if (!origin) return cb(null, true)
            const allowed = ALLOWED_ORIGINS.includes(origin)
            cb(
                allowed
                    ? null
                    : new Error(`Origin ${origin} not allowed by CORS`),
                allowed
            )
        },
        credentials: true,
        methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
)

app.use(
    session({
        secret: 'secret', // TODO dummy secret
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: false, // set true if using HTTPS
            sameSite: 'lax',
        },
    })
)

const logger = pino({ name: 'token-standard-example', level: 'debug' })

function requireLogin(req: Request, res: Response, next: NextFunction) {
    if (!req.session?.sessionToken || !req.session?.party) {
        return res.status(401).json({ error: 'Not authenticated' })
    }
    next()
}

function mapLedgerError(err: unknown) {
    // @ts-expect-error reason TBS
    const grpc = err?.grpcCodeValue ?? err?.error?.grpcCodeValue
    // @ts-expect-error reason TBS
    if (err?.status === 403 || grpc === 7) {
        return {
            status: 403,
            body: { error: 'Permission denied for selected party' },
        }
    }
    return {
        status: 500,
        body: { error: 'Ledger request failed', details: err },
    }
}

const getSessionCtx = (
    sessionToken: string | undefined,
    party: string | undefined
): LedgerCtx => {
    if (!sessionToken || !party) {
        throw new Error('Unauthenticated')
    }
    const client = new LedgerClient(LEDGER_API_URL, sessionToken, logger)
    return { client, party, userId: 'operator' as const }
}

// Login: requires party + token; validate rights once and store in session
app.get('/holdings', requireLogin, async (req, res) => {
    try {
        const ctx = getSessionCtx(req.session.sessionToken, req.session.party)
        const data = await fetchHoldings(ctx)
        res.json(data)
    } catch (err) {
        const m = mapLedgerError(err)
        res.status(m.status).json(m.body)
    }
})

app.get('/transfers', requireLogin, async (req, res) => {
    try {
        const ctx = getSessionCtx(req.session.sessionToken, req.session.party)
        const data = await fetchTransfers(ctx)
        res.json(data)
    } catch (err) {
        const m = mapLedgerError(err)
        res.status(m.status).json(m.body)
    }
})

app.get('/transfer-factories', requireLogin, async (req, res) => {
    try {
        const ctx = getSessionCtx(req.session.sessionToken, req.session.party)
        const data = await fetchTransferFactories(ctx)
        res.json(data)
    } catch (err) {
        const m = mapLedgerError(err)
        res.status(m.status).json(m.body)
    }
})

app.post('/login', async (req, res) => {
    try {
        const { sessionToken, party } = req.body
        if (!sessionToken || !party) {
            return res
                .status(400)
                .json({ error: 'party and sessionToken are required' })
        }

        const client = new LedgerClient(LEDGER_API_URL, sessionToken, logger)
        await validatePartyAccess({ client, party, userId: 'operator' })

        req.session.sessionToken = sessionToken
        req.session.party = party
        req.session.userId = 'operator'

        console.log(`User logged in as party: ${party}`)
        res.json({ status: 'ok', party })
    } catch (err: unknown) {
        const mapped = mapLedgerError(err)
        res.status(mapped.status === 500 ? 401 : mapped.status).json(
            mapped.body
        )
    }
})

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to logout' })
        }
        res.clearCookie('connect.sid')
        return res.json({ status: 'logged out' })
    })
})

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
})
