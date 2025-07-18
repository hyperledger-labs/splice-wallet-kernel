import { OAuth2Server } from 'oauth2-mock-server'
import basicAuth from 'basic-auth'

async function main() {
    const server = new OAuth2Server()

    await server.issuer.keys.generate('RS256')
    await server.start(8889, '127.0.0.1')

    const service = server.service

    service.on('beforeTokenSigning', (token, req) => {
        console.log(req.body)
        const credentials = basicAuth(req)
        const clientId = credentials ? credentials.name : req.body.client_id

        const issuer: string =
            clientId === 'operator' ? '' : 'http://127.0.0.1:8889'

        token.payload.iss = issuer
        const aud = req.body.audience
        token.payload.sub = clientId
        token.payload.aud = aud
        token.payload.scope = 'daml_ledger_api'
    })
}

main()
