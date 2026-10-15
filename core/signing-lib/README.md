# signing-lib

This library provides:

- The OpenRPC typing and controller code generated from [api-specs/openrpc-signing-api.json](../../api-specs/openrpc-signing-api.json)
- A standard `interface` for signing drivers to implement:

```typescript
export interface SigningDriverInterface {
    partyMode: PartyMode
    signingProvider: SigningProvider
    controller: (authContext: AuthContext | undefined) => Methods
}
```

The `controller` function should be an implementation of `buildController` from [./src/rpc-gen/index.ts](./src/rpc-gen/index.ts) which takes an optional `AuthContext`.

To see a simple example of a signing driver, see [core/signing-internal](../signing-internal).

### Data Encodings

When implementing a signing driver, note that the Wallet Gateway expects all keys and signatures to be base64-encoded. If the signing provider represents keys in some other format (i.e. hex-encoded strings), then the driver is responsible for converting between the formats. This provides a consistent and predictible interface to the Wallet Gateway.

### Important Note

Other than the optional `internalTxId` parameter in `signTransaction`, ALL instances of `txId` refer to the TransactionID given by the **signing provider**, not the Wallet Gateway.

While some signing providers allow an external transaction to be stored with the transaction, this _cannot_ be relied upon, therefore in order to lookup specific transactions, the Wallet Gateway must store and use the transaction ID given by the signing provider (which is returned by the `signTransaction` method).
