import { OAuth2Server } from 'oauth2-mock-server'
// import basicAuth from 'basic-auth'

async function main() {
    const server = new OAuth2Server()

    await server.issuer.keys.generate('RS256')
    await server.start(8889, '127.0.0.1')

    const service = server.service

    service.on('beforeTokenSigning', (token, req) => {
        // const credentials = basicAuth(req);
        // const clientId = credentials ? credentials.name : req.body.client_id;
        // const aud = req.body.audience
        // token.payload.sub = clientId
        // token.payload.aud =  aud
        console.log(req.body)
        token.payload.iss = 'http://127.0.0.1:8889'
        token.payload.sub = 'Cg9zZXJ2aWNlLmFjY291bnQSBWxvY2Fs'
        token.payload.aud =
            'https://daml.com/jwt/aud/participant/canton-utilities-app'
        token.payload.scope = 'openid daml_ledger_api offline_access'
    })
}

main()
