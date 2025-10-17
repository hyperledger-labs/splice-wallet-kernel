# Wallet Auth

This workspace contains the authentication logic and interfaces used by the Wallet Gateway.
It provides abstractions for authentication services, user identity management, and integration points for different identity providers (IDPs), such as password-based and OAuth2/OIDC-based authentication.

## Installation

This package requires [NodeJS](https://nodejs.org/) v16 or higher and can be added to your project using:

```sh
npm install @canton-network/core-wallet-auth --save
```

or

```sh
yarn add @canton-network/core-wallet-auth
```

## Interfaces

This workspace defines several core interfaces for authentication.

### [AuthContext](./src/AuthService.ts)

Represents the authentication context for a user, including their unique user ID and the associated access token.

### [AuthAware](./src/AuthService.ts)

Provides a pattern for classes or services that are aware of authentication context.
It exposes the current `authContext` and a method `withAuthContext` to create a new instance with a specific authentication context.
An example the application of this pattern can be seen in the [StoreInternal](../wallet-store/src/StoreInternal.ts).

### [AuthService](./src/AuthService.ts)

Defines the contract for authentication services.
The `verifyToken` method takes an access token and returns an `AuthContext` if the token is valid, or `undefined` otherwise.

## JWT Implementation

For JWT-based authentication, see the [`JwtAuthService`](../wallet-gateway/remote/src/auth/JwtAuthService.ts) implementation.
This service verifies JWT tokens using remote JWK sets and integrates with the Wallet Gateway's network configuration to dynamically resolve the appropriate identity provider for each request.

It is important to note that, since the Wallet Gateway supports multiple identity providers (IDPs), the token issuer (iss) is used as the unique identifier for each IDP.
This component therefore collaborates with the [Store](../wallet-store/src/Store.ts), which enables lookup of the configured IDP based on the issuer value.
