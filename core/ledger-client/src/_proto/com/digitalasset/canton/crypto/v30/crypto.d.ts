import type { BinaryWriteOptions } from '@protobuf-ts/runtime'
import type { IBinaryWriter } from '@protobuf-ts/runtime'
import type { BinaryReadOptions } from '@protobuf-ts/runtime'
import type { IBinaryReader } from '@protobuf-ts/runtime'
import type { PartialMessage } from '@protobuf-ts/runtime'
import { MessageType } from '@protobuf-ts/runtime'
/**
 * @generated from protobuf message com.digitalasset.canton.crypto.v30.Hmac
 */
export interface Hmac {
    /**
     * @generated from protobuf field: com.digitalasset.canton.crypto.v30.HmacAlgorithm algorithm = 1
     */
    algorithm: HmacAlgorithm
    /**
     * @generated from protobuf field: bytes hmac = 2
     */
    hmac: Uint8Array
}
/**
 * @generated from protobuf message com.digitalasset.canton.crypto.v30.Salt
 */
export interface Salt {
    /**
     * @generated from protobuf oneof: algorithm
     */
    algorithm:
        | {
              oneofKind: 'hmac'
              /**
               * @generated from protobuf field: com.digitalasset.canton.crypto.v30.HmacAlgorithm hmac = 1
               */
              hmac: HmacAlgorithm
          }
        | {
              oneofKind: undefined
          }
    /**
     * @generated from protobuf field: bytes salt = 2
     */
    salt: Uint8Array
}
/**
 * @generated from protobuf message com.digitalasset.canton.crypto.v30.Signature
 */
export interface Signature {
    /**
     * @generated from protobuf field: com.digitalasset.canton.crypto.v30.SignatureFormat format = 1
     */
    format: SignatureFormat
    /**
     * @generated from protobuf field: bytes signature = 2
     */
    signature: Uint8Array
    /**
     * The fingerprint/id of the keypair used to create this signature and needed to verify.
     * If a signature delegation is defined, this fingerprint/id is not used to produce the signature, and, instead
     * is used to sign the delegation.
     *
     * @generated from protobuf field: string signed_by = 3
     */
    signedBy: string
    /**
     * The signing algorithm specification used to produce this signature
     *
     * @generated from protobuf field: com.digitalasset.canton.crypto.v30.SigningAlgorithmSpec signing_algorithm_spec = 4
     */
    signingAlgorithmSpec: SigningAlgorithmSpec
    /**
     * An optional signature delegation where a long-term signing key authorizes a session signing key to sign on its
     * behalf.
     *
     * @generated from protobuf field: optional com.digitalasset.canton.crypto.v30.SignatureDelegation signature_delegation = 5
     */
    signatureDelegation?: SignatureDelegation
}
/**
 * @generated from protobuf message com.digitalasset.canton.crypto.v30.SignatureDelegation
 */
export interface SignatureDelegation {
    /**
     * ASN.1 + DER-encoding of X.509 SubjectPublicKeyInfo structure of the session public key:
     * https://datatracker.ietf.org/doc/html/rfc5280#section-4.1. This key was used to produce the actual signature.
     *
     * @generated from protobuf field: bytes session_key = 1
     */
    sessionKey: Uint8Array
    /**
     * The signing key spec for the session key.
     *
     * @generated from protobuf field: com.digitalasset.canton.crypto.v30.SigningKeySpec session_key_spec = 2
     */
    sessionKeySpec: SigningKeySpec
    /**
     * A timestamp in microseconds of UTC time since Unix epoch that indicates when the session key is
     * considered valid.
     *
     * @generated from protobuf field: int64 validity_period_from_inclusive = 3
     */
    validityPeriodFromInclusive: bigint
    /**
     * Duration in seconds indicating how long the session key remains valid.
     * The validity period starts from `validity_period_from_inclusive` above.
     *
     * @generated from protobuf field: uint32 validity_period_duration_seconds = 4
     */
    validityPeriodDurationSeconds: number
    /**
     * The format of the signature
     *
     * @generated from protobuf field: com.digitalasset.canton.crypto.v30.SignatureFormat format = 5
     */
    format: SignatureFormat
    /**
     * The signature of the combined hash of the session key fingerprint, validity period, and synchronizer id, by the
     * long-term key. This signature authorizes the session key to act on behalf of the long-term key.
     *
     * @generated from protobuf field: bytes signature = 6
     */
    signature: Uint8Array
    /**
     * The signing algorithm specification used to produce this signature
     *
     * @generated from protobuf field: com.digitalasset.canton.crypto.v30.SigningAlgorithmSpec signing_algorithm_spec = 7
     */
    signingAlgorithmSpec: SigningAlgorithmSpec
}
/**
 * @generated from protobuf message com.digitalasset.canton.crypto.v30.PublicKey
 */
export interface PublicKey {
    /**
     * @generated from protobuf oneof: key
     */
    key:
        | {
              oneofKind: 'signingPublicKey'
              /**
               * @generated from protobuf field: com.digitalasset.canton.crypto.v30.SigningPublicKey signing_public_key = 1
               */
              signingPublicKey: SigningPublicKey
          }
        | {
              oneofKind: 'encryptionPublicKey'
              /**
               * @generated from protobuf field: com.digitalasset.canton.crypto.v30.EncryptionPublicKey encryption_public_key = 2
               */
              encryptionPublicKey: EncryptionPublicKey
          }
        | {
              oneofKind: undefined
          }
}
/**
 * @generated from protobuf message com.digitalasset.canton.crypto.v30.PublicKeyWithName
 */
export interface PublicKeyWithName {
    /**
     * @generated from protobuf field: com.digitalasset.canton.crypto.v30.PublicKey public_key = 1
     */
    publicKey?: PublicKey
    /**
     * Optional name of the public key
     *
     * @generated from protobuf field: string name = 2
     */
    name: string
}
/**
 * @generated from protobuf message com.digitalasset.canton.crypto.v30.PrivateKey
 */
export interface PrivateKey {
    /**
     * @generated from protobuf oneof: key
     */
    key:
        | {
              oneofKind: 'signingPrivateKey'
              /**
               * @generated from protobuf field: com.digitalasset.canton.crypto.v30.SigningPrivateKey signing_private_key = 1
               */
              signingPrivateKey: SigningPrivateKey
          }
        | {
              oneofKind: 'encryptionPrivateKey'
              /**
               * @generated from protobuf field: com.digitalasset.canton.crypto.v30.EncryptionPrivateKey encryption_private_key = 2
               */
              encryptionPrivateKey: EncryptionPrivateKey
          }
        | {
              oneofKind: undefined
          }
}
/**
 * @generated from protobuf message com.digitalasset.canton.crypto.v30.SigningPublicKey
 */
export interface SigningPublicKey {
    /**
     * @generated from protobuf field: com.digitalasset.canton.crypto.v30.CryptoKeyFormat format = 2
     */
    format: CryptoKeyFormat
    /**
     * Serialized public key in the format specified above
     *
     * @generated from protobuf field: bytes public_key = 3
     */
    publicKey: Uint8Array
    /**
     * No longer used (only kept for backwards compatibility) stores both the crypto key scheme and algorithm.
     *
     * @deprecated
     * @generated from protobuf field: com.digitalasset.canton.crypto.v30.SigningKeyScheme scheme = 4 [deprecated = true]
     */
    scheme: SigningKeyScheme
    /**
     * Explicitly state the key's intended use
     *
     * @generated from protobuf field: repeated com.digitalasset.canton.crypto.v30.SigningKeyUsage usage = 5
     */
    usage: SigningKeyUsage[]
    /**
     * The key specification that was used to generate the key pair
     *
     * @generated from protobuf field: com.digitalasset.canton.crypto.v30.SigningKeySpec key_spec = 6
     */
    keySpec: SigningKeySpec
}
/**
 * @generated from protobuf message com.digitalasset.canton.crypto.v30.SigningPrivateKey
 */
export interface SigningPrivateKey {
    /**
     * @generated from protobuf field: string id = 1
     */
    id: string
    /**
     * @generated from protobuf field: com.digitalasset.canton.crypto.v30.CryptoKeyFormat format = 2
     */
    format: CryptoKeyFormat
    /**
     * Serialized private key in the format specified above
     *
     * @generated from protobuf field: bytes private_key = 3
     */
    privateKey: Uint8Array
    /**
     * No longer used (only kept for backwards compatibility) stores both the crypto key scheme and algorithm.
     *
     * @deprecated
     * @generated from protobuf field: com.digitalasset.canton.crypto.v30.SigningKeyScheme scheme = 4 [deprecated = true]
     */
    scheme: SigningKeyScheme
    /**
     * Explicitly state the key's intended use
     *
     * @generated from protobuf field: repeated com.digitalasset.canton.crypto.v30.SigningKeyUsage usage = 5
     */
    usage: SigningKeyUsage[]
    /**
     * The key specification that was used to generate the key pair
     *
     * @generated from protobuf field: com.digitalasset.canton.crypto.v30.SigningKeySpec key_spec = 6
     */
    keySpec: SigningKeySpec
}
/**
 * @generated from protobuf message com.digitalasset.canton.crypto.v30.SigningKeyPair
 */
export interface SigningKeyPair {
    /**
     * @generated from protobuf field: com.digitalasset.canton.crypto.v30.SigningPublicKey public_key = 1
     */
    publicKey?: SigningPublicKey
    /**
     * @generated from protobuf field: com.digitalasset.canton.crypto.v30.SigningPrivateKey private_key = 2
     */
    privateKey?: SigningPrivateKey
}
/**
 * Used to announce the required signing key and algorithm specifications in the static synchronizer parameters.
 *
 * @generated from protobuf message com.digitalasset.canton.crypto.v30.RequiredSigningSpecs
 */
export interface RequiredSigningSpecs {
    /**
     * @generated from protobuf field: repeated com.digitalasset.canton.crypto.v30.SigningAlgorithmSpec algorithms = 1
     */
    algorithms: SigningAlgorithmSpec[]
    /**
     * @generated from protobuf field: repeated com.digitalasset.canton.crypto.v30.SigningKeySpec keys = 2
     */
    keys: SigningKeySpec[]
}
/**
 * @generated from protobuf message com.digitalasset.canton.crypto.v30.EncryptionPublicKey
 */
export interface EncryptionPublicKey {
    /**
     * @generated from protobuf field: com.digitalasset.canton.crypto.v30.CryptoKeyFormat format = 2
     */
    format: CryptoKeyFormat
    /**
     * Serialized public key in the format specified above
     *
     * @generated from protobuf field: bytes public_key = 3
     */
    publicKey: Uint8Array
    /**
     * No longer used (only kept for backwards compatibility) stores both the crypto key scheme and algorithm.
     *
     * @deprecated
     * @generated from protobuf field: com.digitalasset.canton.crypto.v30.EncryptionKeyScheme scheme = 4 [deprecated = true]
     */
    scheme: EncryptionKeyScheme
    /**
     * The key specification that was used to generate the key pair
     *
     * @generated from protobuf field: com.digitalasset.canton.crypto.v30.EncryptionKeySpec key_spec = 5
     */
    keySpec: EncryptionKeySpec
}
/**
 * @generated from protobuf message com.digitalasset.canton.crypto.v30.EncryptionPrivateKey
 */
export interface EncryptionPrivateKey {
    /**
     * @generated from protobuf field: string id = 1
     */
    id: string
    /**
     * @generated from protobuf field: com.digitalasset.canton.crypto.v30.CryptoKeyFormat format = 2
     */
    format: CryptoKeyFormat
    /**
     * Serialized private key in the format specified above
     *
     * @generated from protobuf field: bytes private_key = 3
     */
    privateKey: Uint8Array
    /**
     * No longer used (only kept for backwards compatibility) stores both the crypto key scheme and algorithm.
     *
     * @deprecated
     * @generated from protobuf field: com.digitalasset.canton.crypto.v30.EncryptionKeyScheme scheme = 4 [deprecated = true]
     */
    scheme: EncryptionKeyScheme
    /**
     * The key specification that was used to generate the key pair
     *
     * @generated from protobuf field: com.digitalasset.canton.crypto.v30.EncryptionKeySpec key_spec = 5
     */
    keySpec: EncryptionKeySpec
}
/**
 * @generated from protobuf message com.digitalasset.canton.crypto.v30.EncryptionKeyPair
 */
export interface EncryptionKeyPair {
    /**
     * @generated from protobuf field: com.digitalasset.canton.crypto.v30.EncryptionPublicKey public_key = 1
     */
    publicKey?: EncryptionPublicKey
    /**
     * @generated from protobuf field: com.digitalasset.canton.crypto.v30.EncryptionPrivateKey private_key = 2
     */
    privateKey?: EncryptionPrivateKey
}
/**
 * Used to announce the required encryption key and algorithm specifications in the static synchronizer parameters.
 *
 * @generated from protobuf message com.digitalasset.canton.crypto.v30.RequiredEncryptionSpecs
 */
export interface RequiredEncryptionSpecs {
    /**
     * @generated from protobuf field: repeated com.digitalasset.canton.crypto.v30.EncryptionAlgorithmSpec algorithms = 1
     */
    algorithms: EncryptionAlgorithmSpec[]
    /**
     * @generated from protobuf field: repeated com.digitalasset.canton.crypto.v30.EncryptionKeySpec keys = 2
     */
    keys: EncryptionKeySpec[]
}
/**
 * @generated from protobuf message com.digitalasset.canton.crypto.v30.CryptoKeyPair
 */
export interface CryptoKeyPair {
    /**
     * @generated from protobuf oneof: pair
     */
    pair:
        | {
              oneofKind: 'signingKeyPair'
              /**
               * @generated from protobuf field: com.digitalasset.canton.crypto.v30.SigningKeyPair signing_key_pair = 1
               */
              signingKeyPair: SigningKeyPair
          }
        | {
              oneofKind: 'encryptionKeyPair'
              /**
               * @generated from protobuf field: com.digitalasset.canton.crypto.v30.EncryptionKeyPair encryption_key_pair = 2
               */
              encryptionKeyPair: EncryptionKeyPair
          }
        | {
              oneofKind: undefined
          }
}
/**
 * @generated from protobuf message com.digitalasset.canton.crypto.v30.SymmetricKey
 */
export interface SymmetricKey {
    /**
     * @generated from protobuf field: com.digitalasset.canton.crypto.v30.CryptoKeyFormat format = 1
     */
    format: CryptoKeyFormat
    /**
     * @generated from protobuf field: bytes key = 2
     */
    key: Uint8Array
    /**
     * @generated from protobuf field: com.digitalasset.canton.crypto.v30.SymmetricKeyScheme scheme = 3
     */
    scheme: SymmetricKeyScheme
}
/**
 * A password-based encrypted message
 *
 * @generated from protobuf message com.digitalasset.canton.crypto.v30.PasswordBasedEncrypted
 */
export interface PasswordBasedEncrypted {
    /**
     * @generated from protobuf field: bytes ciphertext = 1
     */
    ciphertext: Uint8Array
    /**
     * The symmetric encryption scheme that was used to encrypt the plaintext
     *
     * @generated from protobuf field: com.digitalasset.canton.crypto.v30.SymmetricKeyScheme symmetric_key_scheme = 2
     */
    symmetricKeyScheme: SymmetricKeyScheme
    /**
     * The password-based KDF that was used to derive the symmetric encryption key from the password
     *
     * @generated from protobuf field: com.digitalasset.canton.crypto.v30.PbkdfScheme pbkdf_scheme = 3
     */
    pbkdfScheme: PbkdfScheme
    /**
     * The random salt that was used to derive the symmetric encryption key from the password
     *
     * @generated from protobuf field: bytes salt = 4
     */
    salt: Uint8Array
}
/**
 * @generated from protobuf message com.digitalasset.canton.crypto.v30.AsymmetricEncrypted
 */
export interface AsymmetricEncrypted {
    /**
     * Asymmetrically encrypted data
     *
     * @generated from protobuf field: bytes ciphertext = 1
     */
    ciphertext: Uint8Array
    /**
     * The asymmetric encryption specification used for the encryption
     *
     * @generated from protobuf field: com.digitalasset.canton.crypto.v30.EncryptionAlgorithmSpec encryption_algorithm_spec = 2
     */
    encryptionAlgorithmSpec: EncryptionAlgorithmSpec
    /**
     * The fingerprint of the public key that was used for the encryption
     *
     * @generated from protobuf field: string fingerprint = 3
     */
    fingerprint: string
}
/**
 * @generated from protobuf enum com.digitalasset.canton.crypto.v30.HashAlgorithm
 */
export declare enum HashAlgorithm {
    /**
     * @generated from protobuf enum value: HASH_ALGORITHM_UNSPECIFIED = 0;
     */
    UNSPECIFIED = 0,
    /**
     * @generated from protobuf enum value: HASH_ALGORITHM_SHA256 = 1;
     */
    SHA256 = 1,
}
/**
 * @generated from protobuf enum com.digitalasset.canton.crypto.v30.HmacAlgorithm
 */
export declare enum HmacAlgorithm {
    /**
     * @generated from protobuf enum value: HMAC_ALGORITHM_UNSPECIFIED = 0;
     */
    UNSPECIFIED = 0,
    /**
     * @generated from protobuf enum value: HMAC_ALGORITHM_HMAC_SHA256 = 1;
     */
    HMAC_SHA256 = 1,
}
/**
 * @generated from protobuf enum com.digitalasset.canton.crypto.v30.SignatureFormat
 */
export declare enum SignatureFormat {
    /**
     * @generated from protobuf enum value: SIGNATURE_FORMAT_UNSPECIFIED = 0;
     */
    UNSPECIFIED = 0,
    /**
     * Signature scheme specific signature format
     * Legacy format no longer used, except for migrations
     *
     * @generated from protobuf enum value: SIGNATURE_FORMAT_CONCAT = 1;
     */
    RAW = 1,
    /**
     * ASN.1 + DER-encoding of the `r` and `s` integers, as defined in https://datatracker.ietf.org/doc/html/rfc3279#section-2.2.3
     * Used for ECDSA signatures
     *
     * @generated from protobuf enum value: SIGNATURE_FORMAT_DER = 2;
     */
    DER = 2,
    /**
     * Concatenation of the integers `r || s` in little-endian form, as defined in https://datatracker.ietf.org/doc/html/rfc8032#section-3.3
     * Note that this is different from the format defined in IEEE P1363, which uses concatenation in big-endian form.
     * Used for EdDSA signatures
     *
     * @generated from protobuf enum value: SIGNATURE_FORMAT_CONCAT = 3;
     */
    CONCAT = 3,
    /**
     * Symbolic crypto, must only be used for testing
     *
     * @generated from protobuf enum value: SIGNATURE_FORMAT_SYMBOLIC = 10000;
     */
    SYMBOLIC = 10000,
}
/**
 * @generated from protobuf enum com.digitalasset.canton.crypto.v30.EncryptionKeySpec
 */
export declare enum EncryptionKeySpec {
    /**
     * @generated from protobuf enum value: ENCRYPTION_KEY_SPEC_UNSPECIFIED = 0;
     */
    UNSPECIFIED = 0,
    /**
     * Elliptic Curve Key from the NIST P-256 curve (aka Secp256r1)
     * as defined in https://doi.org/10.6028/NIST.FIPS.186-4
     *
     * @generated from protobuf enum value: ENCRYPTION_KEY_SPEC_EC_P256 = 1;
     */
    EC_P256 = 1,
    /**
     * RSA with 2048 bits
     *
     * @generated from protobuf enum value: ENCRYPTION_KEY_SPEC_RSA_2048 = 2;
     */
    RSA_2048 = 2,
}
/**
 * [start-docs-entry: signing key spec proto]
 *
 * @generated from protobuf enum com.digitalasset.canton.crypto.v30.SigningKeySpec
 */
export declare enum SigningKeySpec {
    /**
     * @generated from protobuf enum value: SIGNING_KEY_SPEC_UNSPECIFIED = 0;
     */
    UNSPECIFIED = 0,
    /**
     * Elliptic Curve Key from Curve25519
     * as defined in http://ed25519.cr.yp.to/
     *
     * @generated from protobuf enum value: SIGNING_KEY_SPEC_EC_CURVE25519 = 1;
     */
    EC_CURVE25519 = 1,
    /**
     * Elliptic Curve Key from the NIST P-256 curve (aka secp256r1)
     * as defined in https://doi.org/10.6028/NIST.FIPS.186-4
     *
     * @generated from protobuf enum value: SIGNING_KEY_SPEC_EC_P256 = 2;
     */
    EC_P256 = 2,
    /**
     * Elliptic Curve Key from the NIST P-384 curve (aka secp384r1)
     * as defined in https://doi.org/10.6028/NIST.FIPS.186-4
     *
     * @generated from protobuf enum value: SIGNING_KEY_SPEC_EC_P384 = 3;
     */
    EC_P384 = 3,
    /**
     * Elliptic Curve Key from SECG P256k1 curve (aka secp256k1)
     * commonly used in bitcoin and ethereum
     * as defined in https://www.secg.org/sec2-v2.pdf
     *
     * @generated from protobuf enum value: SIGNING_KEY_SPEC_EC_SECP256K1 = 4;
     */
    EC_SECP256K1 = 4,
}
/**
 * @generated from protobuf enum com.digitalasset.canton.crypto.v30.KeyPurpose
 */
export declare enum KeyPurpose {
    /**
     * @generated from protobuf enum value: KEY_PURPOSE_UNSPECIFIED = 0;
     */
    UNSPECIFIED = 0,
    /**
     * @generated from protobuf enum value: KEY_PURPOSE_SIGNING = 1;
     */
    SIGNING = 1,
    /**
     * @generated from protobuf enum value: KEY_PURPOSE_ENCRYPTION = 2;
     */
    ENCRYPTION = 2,
}
/**
 * @generated from protobuf enum com.digitalasset.canton.crypto.v30.SigningKeyUsage
 */
export declare enum SigningKeyUsage {
    /**
     * @generated from protobuf enum value: SIGNING_KEY_USAGE_UNSPECIFIED = 0;
     */
    UNSPECIFIED = 0,
    /**
     * the root namespace key that defines a node's identity and signs topology requests
     *
     * @generated from protobuf enum value: SIGNING_KEY_USAGE_NAMESPACE = 1;
     */
    NAMESPACE = 1,
    /**
     * No longer used (only kept for backwards compatibility)
     *
     * @deprecated
     * @generated from protobuf enum value: SIGNING_KEY_USAGE_IDENTITY_DELEGATION = 2 [deprecated = true];
     */
    IDENTITY_DELEGATION = 2,
    /**
     * keys that authenticate members of the network towards a sequencer
     *
     * @generated from protobuf enum value: SIGNING_KEY_USAGE_SEQUENCER_AUTHENTICATION = 3;
     */
    SEQUENCER_AUTHENTICATION = 3,
    /**
     * keys that deal with all the signing that happens as part of the protocol
     *
     * @generated from protobuf enum value: SIGNING_KEY_USAGE_PROTOCOL = 4;
     */
    PROTOCOL = 4,
    /**
     * used internally to identify keys that can self-sign to prove ownership
     *
     * @generated from protobuf enum value: SIGNING_KEY_USAGE_PROOF_OF_OWNERSHIP = 5;
     */
    PROOF_OF_OWNERSHIP = 5,
}
/**
 * @generated from protobuf enum com.digitalasset.canton.crypto.v30.SigningAlgorithmSpec
 */
export declare enum SigningAlgorithmSpec {
    /**
     * @generated from protobuf enum value: SIGNING_ALGORITHM_SPEC_UNSPECIFIED = 0;
     */
    UNSPECIFIED = 0,
    /**
     * EdDSA Signature based on Curve25519 with SHA-512
     * http://ed25519.cr.yp.to/
     *
     * @generated from protobuf enum value: SIGNING_ALGORITHM_SPEC_ED25519 = 1;
     */
    ED25519 = 1,
    /**
     * Elliptic Curve Digital Signature Algorithm with SHA256
     *
     * @generated from protobuf enum value: SIGNING_ALGORITHM_SPEC_EC_DSA_SHA_256 = 2;
     */
    EC_DSA_SHA_256 = 2,
    /**
     * Elliptic Curve Digital Signature Algorithm with SHA384
     *
     * @generated from protobuf enum value: SIGNING_ALGORITHM_SPEC_EC_DSA_SHA_384 = 3;
     */
    EC_DSA_SHA_384 = 3,
}
/**
 * @deprecated
 *
 * @generated from protobuf enum com.digitalasset.canton.crypto.v30.SigningKeyScheme
 */
export declare enum SigningKeyScheme {
    /**
     * @generated from protobuf enum value: SIGNING_KEY_SCHEME_UNSPECIFIED = 0;
     */
    UNSPECIFIED = 0,
    /**
     * Signature based on Curve25519
     * http://ed25519.cr.yp.to/
     *
     * @generated from protobuf enum value: SIGNING_KEY_SCHEME_ED25519 = 1;
     */
    ED25519 = 1,
    /**
     * EC-DSA with NIST curve P-256 or P-384
     *
     * @generated from protobuf enum value: SIGNING_KEY_SCHEME_EC_DSA_P256 = 2;
     */
    EC_DSA_P256 = 2,
    /**
     * @generated from protobuf enum value: SIGNING_KEY_SCHEME_EC_DSA_P384 = 3;
     */
    EC_DSA_P384 = 3,
}
/**
 * @generated from protobuf enum com.digitalasset.canton.crypto.v30.EncryptionAlgorithmSpec
 */
export declare enum EncryptionAlgorithmSpec {
    /**
     * @generated from protobuf enum value: ENCRYPTION_ALGORITHM_SPEC_UNSPECIFIED = 0;
     */
    UNSPECIFIED = 0,
    /**
     * ECIES with ECDH, AES128 GCM, and HKDF and authentication (MAC) with HMAC-SHA256. This requires a P-256 key
     * because we use SHA256 and we need to align the lengths of the curve and the hash function.
     *
     * @generated from protobuf enum value: ENCRYPTION_ALGORITHM_SPEC_ECIES_HKDF_HMAC_SHA256_AES128GCM = 1;
     */
    ECIES_HKDF_HMAC_SHA256_AES128GCM = 1,
    /**
     * ECIES with ECDH, AES128 CBC, and HKDF and authentication (MAC) with HMAC-SHA256. This requires a P-256 key
     * because we use SHA256 and we need to align the lengths of the curve the and hash function.
     *
     * @generated from protobuf enum value: ENCRYPTION_ALGORITHM_SPEC_ECIES_HKDF_HMAC_SHA256_AES128CBC = 2;
     */
    ECIES_HKDF_HMAC_SHA256_AES128CBC = 2,
    /**
     * RSA with OAEP Padding,
     * using SHA-256 for both the hash and in the MGF1 mask generation function along with an empty label.
     *
     * @generated from protobuf enum value: ENCRYPTION_ALGORITHM_SPEC_RSA_OAEP_SHA256 = 3;
     */
    RSA_OAEP_SHA256 = 3,
}
/**
 * @deprecated
 *
 * @generated from protobuf enum com.digitalasset.canton.crypto.v30.EncryptionKeyScheme
 */
export declare enum EncryptionKeyScheme {
    /**
     * @generated from protobuf enum value: ENCRYPTION_KEY_SCHEME_UNSPECIFIED = 0;
     */
    UNSPECIFIED = 0,
    /**
     * ECIES with ECDH over NIST P-256, AES128 GCM, and HKDF with HMAC-SHA256
     *
     * @generated from protobuf enum value: ENCRYPTION_KEY_SCHEME_ECIES_P256_HKDF_HMAC_SHA256_AES128GCM = 1;
     */
    ECIES_P256_HKDF_HMAC_SHA256_AES128GCM = 1,
    /**
     * ECIES with ECDH over NIST P-256, AES128 CBC, and HKDF and authentication with HMAC-SHA256
     *
     * @generated from protobuf enum value: ENCRYPTION_KEY_SCHEME_ECIES_P256_HMAC_SHA256A_ES128CBC = 2;
     */
    ECIES_P256_HMAC_SHA256A_ES128CBC = 2,
    /**
     * RSA with a 2048 bit key with OAEP Padding,
     * using SHA-256 for both the hash and in the MGF1 mask generation function along with an empty label.
     *
     * @generated from protobuf enum value: ENCRYPTION_KEY_SCHEME_RSA2048_OAEP_SHA256 = 3;
     */
    RSA2048_OAEP_SHA256 = 3,
}
/**
 * @generated from protobuf enum com.digitalasset.canton.crypto.v30.SymmetricKeyScheme
 */
export declare enum SymmetricKeyScheme {
    /**
     * @generated from protobuf enum value: SYMMETRIC_KEY_SCHEME_UNSPECIFIED = 0;
     */
    UNSPECIFIED = 0,
    /**
     * AES with 128bit keys in GCM
     *
     * @generated from protobuf enum value: SYMMETRIC_KEY_SCHEME_AES128GCM = 1;
     */
    AES128GCM = 1,
}
/**
 * Serialization format for crypto keys and signatures
 *
 * @generated from protobuf enum com.digitalasset.canton.crypto.v30.CryptoKeyFormat
 */
export declare enum CryptoKeyFormat {
    /**
     * @generated from protobuf enum value: CRYPTO_KEY_FORMAT_UNSPECIFIED = 0;
     */
    UNSPECIFIED = 0,
    /**
     * ASN.1 + DER encoding
     * Legacy format no longer used, except for migrations
     *
     * @generated from protobuf enum value: CRYPTO_KEY_FORMAT_DER = 2;
     */
    DER = 2,
    /**
     * Raw encoding of a key, used for symmetric keys
     *
     * @generated from protobuf enum value: CRYPTO_KEY_FORMAT_RAW = 3;
     */
    RAW = 3,
    /**
     * ASN.1 + DER-encoding of X.509 SubjectPublicKeyInfo structure: https://datatracker.ietf.org/doc/html/rfc5280#section-4.1
     *
     * @generated from protobuf enum value: CRYPTO_KEY_FORMAT_DER_X509_SUBJECT_PUBLIC_KEY_INFO = 4;
     */
    DER_X509_SUBJECT_PUBLIC_KEY_INFO = 4,
    /**
     * ASN.1 + DER-encoding of PKCS #8 PrivateKeyInfo structure: https://datatracker.ietf.org/doc/html/rfc5208#section-5
     *
     * @generated from protobuf enum value: CRYPTO_KEY_FORMAT_DER_PKCS8_PRIVATE_KEY_INFO = 5;
     */
    DER_PKCS8_PRIVATE_KEY_INFO = 5,
    /**
     * Symbolic crypto, must only be used for testing
     *
     * @generated from protobuf enum value: CRYPTO_KEY_FORMAT_SYMBOLIC = 10000;
     */
    SYMBOLIC = 10000,
}
/**
 * @generated from protobuf enum com.digitalasset.canton.crypto.v30.PbkdfScheme
 */
export declare enum PbkdfScheme {
    /**
     * @generated from protobuf enum value: PBKDF_SCHEME_UNSPECIFIED = 0;
     */
    UNSPECIFIED = 0,
    /**
     * Argon2id with m=12288 (12 MiB), t=3, p=1
     *
     * @generated from protobuf enum value: PBKDF_SCHEME_ARGON2ID_MODE1 = 1;
     */
    ARGON2ID_MODE1 = 1,
}
declare class Hmac$Type extends MessageType<Hmac> {
    constructor()
    create(value?: PartialMessage<Hmac>): Hmac
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: Hmac
    ): Hmac
    internalBinaryWrite(
        message: Hmac,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.crypto.v30.Hmac
 */
export declare const Hmac: Hmac$Type
declare class Salt$Type extends MessageType<Salt> {
    constructor()
    create(value?: PartialMessage<Salt>): Salt
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: Salt
    ): Salt
    internalBinaryWrite(
        message: Salt,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.crypto.v30.Salt
 */
export declare const Salt: Salt$Type
declare class Signature$Type extends MessageType<Signature> {
    constructor()
    create(value?: PartialMessage<Signature>): Signature
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: Signature
    ): Signature
    internalBinaryWrite(
        message: Signature,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.crypto.v30.Signature
 */
export declare const Signature: Signature$Type
declare class SignatureDelegation$Type extends MessageType<SignatureDelegation> {
    constructor()
    create(value?: PartialMessage<SignatureDelegation>): SignatureDelegation
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: SignatureDelegation
    ): SignatureDelegation
    internalBinaryWrite(
        message: SignatureDelegation,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.crypto.v30.SignatureDelegation
 */
export declare const SignatureDelegation: SignatureDelegation$Type
declare class PublicKey$Type extends MessageType<PublicKey> {
    constructor()
    create(value?: PartialMessage<PublicKey>): PublicKey
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: PublicKey
    ): PublicKey
    internalBinaryWrite(
        message: PublicKey,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.crypto.v30.PublicKey
 */
export declare const PublicKey: PublicKey$Type
declare class PublicKeyWithName$Type extends MessageType<PublicKeyWithName> {
    constructor()
    create(value?: PartialMessage<PublicKeyWithName>): PublicKeyWithName
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: PublicKeyWithName
    ): PublicKeyWithName
    internalBinaryWrite(
        message: PublicKeyWithName,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.crypto.v30.PublicKeyWithName
 */
export declare const PublicKeyWithName: PublicKeyWithName$Type
declare class PrivateKey$Type extends MessageType<PrivateKey> {
    constructor()
    create(value?: PartialMessage<PrivateKey>): PrivateKey
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: PrivateKey
    ): PrivateKey
    internalBinaryWrite(
        message: PrivateKey,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.crypto.v30.PrivateKey
 */
export declare const PrivateKey: PrivateKey$Type
declare class SigningPublicKey$Type extends MessageType<SigningPublicKey> {
    constructor()
    create(value?: PartialMessage<SigningPublicKey>): SigningPublicKey
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: SigningPublicKey
    ): SigningPublicKey
    internalBinaryWrite(
        message: SigningPublicKey,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.crypto.v30.SigningPublicKey
 */
export declare const SigningPublicKey: SigningPublicKey$Type
declare class SigningPrivateKey$Type extends MessageType<SigningPrivateKey> {
    constructor()
    create(value?: PartialMessage<SigningPrivateKey>): SigningPrivateKey
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: SigningPrivateKey
    ): SigningPrivateKey
    internalBinaryWrite(
        message: SigningPrivateKey,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.crypto.v30.SigningPrivateKey
 */
export declare const SigningPrivateKey: SigningPrivateKey$Type
declare class SigningKeyPair$Type extends MessageType<SigningKeyPair> {
    constructor()
    create(value?: PartialMessage<SigningKeyPair>): SigningKeyPair
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: SigningKeyPair
    ): SigningKeyPair
    internalBinaryWrite(
        message: SigningKeyPair,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.crypto.v30.SigningKeyPair
 */
export declare const SigningKeyPair: SigningKeyPair$Type
declare class RequiredSigningSpecs$Type extends MessageType<RequiredSigningSpecs> {
    constructor()
    create(value?: PartialMessage<RequiredSigningSpecs>): RequiredSigningSpecs
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: RequiredSigningSpecs
    ): RequiredSigningSpecs
    internalBinaryWrite(
        message: RequiredSigningSpecs,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.crypto.v30.RequiredSigningSpecs
 */
export declare const RequiredSigningSpecs: RequiredSigningSpecs$Type
declare class EncryptionPublicKey$Type extends MessageType<EncryptionPublicKey> {
    constructor()
    create(value?: PartialMessage<EncryptionPublicKey>): EncryptionPublicKey
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: EncryptionPublicKey
    ): EncryptionPublicKey
    internalBinaryWrite(
        message: EncryptionPublicKey,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.crypto.v30.EncryptionPublicKey
 */
export declare const EncryptionPublicKey: EncryptionPublicKey$Type
declare class EncryptionPrivateKey$Type extends MessageType<EncryptionPrivateKey> {
    constructor()
    create(value?: PartialMessage<EncryptionPrivateKey>): EncryptionPrivateKey
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: EncryptionPrivateKey
    ): EncryptionPrivateKey
    internalBinaryWrite(
        message: EncryptionPrivateKey,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.crypto.v30.EncryptionPrivateKey
 */
export declare const EncryptionPrivateKey: EncryptionPrivateKey$Type
declare class EncryptionKeyPair$Type extends MessageType<EncryptionKeyPair> {
    constructor()
    create(value?: PartialMessage<EncryptionKeyPair>): EncryptionKeyPair
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: EncryptionKeyPair
    ): EncryptionKeyPair
    internalBinaryWrite(
        message: EncryptionKeyPair,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.crypto.v30.EncryptionKeyPair
 */
export declare const EncryptionKeyPair: EncryptionKeyPair$Type
declare class RequiredEncryptionSpecs$Type extends MessageType<RequiredEncryptionSpecs> {
    constructor()
    create(
        value?: PartialMessage<RequiredEncryptionSpecs>
    ): RequiredEncryptionSpecs
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: RequiredEncryptionSpecs
    ): RequiredEncryptionSpecs
    internalBinaryWrite(
        message: RequiredEncryptionSpecs,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.crypto.v30.RequiredEncryptionSpecs
 */
export declare const RequiredEncryptionSpecs: RequiredEncryptionSpecs$Type
declare class CryptoKeyPair$Type extends MessageType<CryptoKeyPair> {
    constructor()
    create(value?: PartialMessage<CryptoKeyPair>): CryptoKeyPair
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: CryptoKeyPair
    ): CryptoKeyPair
    internalBinaryWrite(
        message: CryptoKeyPair,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.crypto.v30.CryptoKeyPair
 */
export declare const CryptoKeyPair: CryptoKeyPair$Type
declare class SymmetricKey$Type extends MessageType<SymmetricKey> {
    constructor()
    create(value?: PartialMessage<SymmetricKey>): SymmetricKey
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: SymmetricKey
    ): SymmetricKey
    internalBinaryWrite(
        message: SymmetricKey,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.crypto.v30.SymmetricKey
 */
export declare const SymmetricKey: SymmetricKey$Type
declare class PasswordBasedEncrypted$Type extends MessageType<PasswordBasedEncrypted> {
    constructor()
    create(
        value?: PartialMessage<PasswordBasedEncrypted>
    ): PasswordBasedEncrypted
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: PasswordBasedEncrypted
    ): PasswordBasedEncrypted
    internalBinaryWrite(
        message: PasswordBasedEncrypted,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.crypto.v30.PasswordBasedEncrypted
 */
export declare const PasswordBasedEncrypted: PasswordBasedEncrypted$Type
declare class AsymmetricEncrypted$Type extends MessageType<AsymmetricEncrypted> {
    constructor()
    create(value?: PartialMessage<AsymmetricEncrypted>): AsymmetricEncrypted
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: AsymmetricEncrypted
    ): AsymmetricEncrypted
    internalBinaryWrite(
        message: AsymmetricEncrypted,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.crypto.v30.AsymmetricEncrypted
 */
export declare const AsymmetricEncrypted: AsymmetricEncrypted$Type
export {}
//# sourceMappingURL=crypto.d.ts.map
