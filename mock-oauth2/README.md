# mock-oauth2

A local OAuth2 mock server used for development and tests.

## What this server does

- Starts an OAuth2 issuer on `http://127.0.0.1:8889`.
- Supports authorization-code flow.
- Signs access tokens with generated keys.
- Adds token claims from the request (`aud`, `sub`, `scope`, `iat`, `exp`).

## PKCE behavior

The server now enforces PKCE (`S256`) for `authorization_code` requests:

- During authorization redirect (`beforeAuthorizeRedirect`):
    - Reads `code_challenge` and `code_challenge_method` from query params.
    - Rejects the request unless `code_challenge_method === "S256"`.
    - Stores the `code_challenge` keyed by generated authorization code.
- During token exchange (`beforeResponse`):
    - Validates presence of `code` and `code_verifier`.
    - Verifies `base64url(sha256(code_verifier))` matches the stored challenge.
    - Returns OAuth-style errors (`invalid_request` / `invalid_grant`) on failures.

## Events/hooks in use

- `beforeAuthorizeRedirect`: validates/stores PKCE challenge.
- `beforeResponse`: validates PKCE verifier for token endpoint requests.
- `beforeTokenSigning`: enriches token payload for local integration needs.

## Running locally

From repository root:

- `yarn workspace @canton-network/mock-oauth2 dev`
- `yarn workspace @canton-network/mock-oauth2 start`

Build:

- `yarn workspace @canton-network/mock-oauth2 build`
