import { OAuth2Server } from 'oauth2-mock-server'
import basicAuth from 'basic-auth'
import pino from 'pino'
const logger = pino({ name: 'mock-oauth2-server', level: 'debug' })

async function main() {
    logger.info('Starting mock-oauth2 server...')

    const server = new OAuth2Server()
    const host = '127.0.0.1'
    const port = 8889
    const protocol = 'http'

    await server.issuer.keys.generate('RS256')
    await server.start(port, host)

    logger.info('Mock OAuth2 server started')

    const service = server.service

    service.on('beforeTokenSigning', (token, req) => {
        logger.info({ body: req.body }, 'Received token request')
        const credentials = basicAuth(req)
        const clientId = credentials ? credentials.name : req.body.client_id

        token.payload.iss = `${protocol}://${host}:${port}`
        const aud = req.body.audience
        token.payload.sub = clientId // Mocked subject given the clientId
        token.payload.aud = aud
        token.payload.scope = 'daml_ledger_api'
        logger.debug(`Payload before signing: ${JSON.stringify(token.payload)}`)
    })
}

main()
