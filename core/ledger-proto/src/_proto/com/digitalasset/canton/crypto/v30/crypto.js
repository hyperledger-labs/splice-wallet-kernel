import { WireType } from '@protobuf-ts/runtime'
import { UnknownFieldHandler } from '@protobuf-ts/runtime'
import { reflectionMergePartial } from '@protobuf-ts/runtime'
import { MessageType } from '@protobuf-ts/runtime'
/**
 * @generated from protobuf enum com.digitalasset.canton.crypto.v30.HashAlgorithm
 */
export var HashAlgorithm
;(function (HashAlgorithm) {
    /**
     * @generated from protobuf enum value: HASH_ALGORITHM_UNSPECIFIED = 0;
     */
    HashAlgorithm[(HashAlgorithm['UNSPECIFIED'] = 0)] = 'UNSPECIFIED'
    /**
     * @generated from protobuf enum value: HASH_ALGORITHM_SHA256 = 1;
     */
    HashAlgorithm[(HashAlgorithm['SHA256'] = 1)] = 'SHA256'
})(HashAlgorithm || (HashAlgorithm = {}))
/**
 * @generated from protobuf enum com.digitalasset.canton.crypto.v30.HmacAlgorithm
 */
export var HmacAlgorithm
;(function (HmacAlgorithm) {
    /**
     * @generated from protobuf enum value: HMAC_ALGORITHM_UNSPECIFIED = 0;
     */
    HmacAlgorithm[(HmacAlgorithm['UNSPECIFIED'] = 0)] = 'UNSPECIFIED'
    /**
     * @generated from protobuf enum value: HMAC_ALGORITHM_HMAC_SHA256 = 1;
     */
    HmacAlgorithm[(HmacAlgorithm['HMAC_SHA256'] = 1)] = 'HMAC_SHA256'
})(HmacAlgorithm || (HmacAlgorithm = {}))
/**
 * @generated from protobuf enum com.digitalasset.canton.crypto.v30.SignatureFormat
 */
export var SignatureFormat
;(function (SignatureFormat) {
    /**
     * @generated from protobuf enum value: SIGNATURE_FORMAT_UNSPECIFIED = 0;
     */
    SignatureFormat[(SignatureFormat['UNSPECIFIED'] = 0)] = 'UNSPECIFIED'
    /**
     * Signature scheme specific signature format
     * Legacy format no longer used, except for migrations
     *
     * @generated from protobuf enum value: SIGNATURE_FORMAT_RAW = 1;
     */
    SignatureFormat[(SignatureFormat['RAW'] = 1)] = 'RAW'
    /**
     * ASN.1 + DER-encoding of the `r` and `s` integers, as defined in https://datatracker.ietf.org/doc/html/rfc3279#section-2.2.3
     * Used for ECDSA signatures
     *
     * @generated from protobuf enum value: SIGNATURE_FORMAT_DER = 2;
     */
    SignatureFormat[(SignatureFormat['DER'] = 2)] = 'DER'
    /**
     * Concatenation of the integers `r || s` in little-endian form, as defined in https://datatracker.ietf.org/doc/html/rfc8032#section-3.3
     * Note that this is different from the format defined in IEEE P1363, which uses concatenation in big-endian form.
     * Used for EdDSA signatures
     *
     * @generated from protobuf enum value: SIGNATURE_FORMAT_CONCAT = 3;
     */
    SignatureFormat[(SignatureFormat['CONCAT'] = 3)] = 'CONCAT'
    /**
     * Symbolic crypto, must only be used for testing
     *
     * @generated from protobuf enum value: SIGNATURE_FORMAT_SYMBOLIC = 10000;
     */
    SignatureFormat[(SignatureFormat['SYMBOLIC'] = 10000)] = 'SYMBOLIC'
})(SignatureFormat || (SignatureFormat = {}))
/**
 * @generated from protobuf enum com.digitalasset.canton.crypto.v30.EncryptionKeySpec
 */
export var EncryptionKeySpec
;(function (EncryptionKeySpec) {
    /**
     * @generated from protobuf enum value: ENCRYPTION_KEY_SPEC_UNSPECIFIED = 0;
     */
    EncryptionKeySpec[(EncryptionKeySpec['UNSPECIFIED'] = 0)] = 'UNSPECIFIED'
    /**
     * Elliptic Curve Key from the NIST P-256 curve (aka Secp256r1)
     * as defined in https://doi.org/10.6028/NIST.FIPS.186-4
     *
     * @generated from protobuf enum value: ENCRYPTION_KEY_SPEC_EC_P256 = 1;
     */
    EncryptionKeySpec[(EncryptionKeySpec['EC_P256'] = 1)] = 'EC_P256'
    /**
     * RSA with 2048 bits
     *
     * @generated from protobuf enum value: ENCRYPTION_KEY_SPEC_RSA_2048 = 2;
     */
    EncryptionKeySpec[(EncryptionKeySpec['RSA_2048'] = 2)] = 'RSA_2048'
})(EncryptionKeySpec || (EncryptionKeySpec = {}))
/**
 * [start-docs-entry: signing key spec proto]
 *
 * @generated from protobuf enum com.digitalasset.canton.crypto.v30.SigningKeySpec
 */
export var SigningKeySpec
;(function (SigningKeySpec) {
    /**
     * @generated from protobuf enum value: SIGNING_KEY_SPEC_UNSPECIFIED = 0;
     */
    SigningKeySpec[(SigningKeySpec['UNSPECIFIED'] = 0)] = 'UNSPECIFIED'
    /**
     * Elliptic Curve Key from Curve25519
     * as defined in http://ed25519.cr.yp.to/
     *
     * @generated from protobuf enum value: SIGNING_KEY_SPEC_EC_CURVE25519 = 1;
     */
    SigningKeySpec[(SigningKeySpec['EC_CURVE25519'] = 1)] = 'EC_CURVE25519'
    /**
     * Elliptic Curve Key from the NIST P-256 curve (aka secp256r1)
     * as defined in https://doi.org/10.6028/NIST.FIPS.186-4
     *
     * @generated from protobuf enum value: SIGNING_KEY_SPEC_EC_P256 = 2;
     */
    SigningKeySpec[(SigningKeySpec['EC_P256'] = 2)] = 'EC_P256'
    /**
     * Elliptic Curve Key from the NIST P-384 curve (aka secp384r1)
     * as defined in https://doi.org/10.6028/NIST.FIPS.186-4
     *
     * @generated from protobuf enum value: SIGNING_KEY_SPEC_EC_P384 = 3;
     */
    SigningKeySpec[(SigningKeySpec['EC_P384'] = 3)] = 'EC_P384'
    /**
     * Elliptic Curve Key from SECG P256k1 curve (aka secp256k1)
     * commonly used in bitcoin and ethereum
     * as defined in https://www.secg.org/sec2-v2.pdf
     *
     * @generated from protobuf enum value: SIGNING_KEY_SPEC_EC_SECP256K1 = 4;
     */
    SigningKeySpec[(SigningKeySpec['EC_SECP256K1'] = 4)] = 'EC_SECP256K1'
})(SigningKeySpec || (SigningKeySpec = {}))
/**
 * @generated from protobuf enum com.digitalasset.canton.crypto.v30.KeyPurpose
 */
export var KeyPurpose
;(function (KeyPurpose) {
    /**
     * @generated from protobuf enum value: KEY_PURPOSE_UNSPECIFIED = 0;
     */
    KeyPurpose[(KeyPurpose['UNSPECIFIED'] = 0)] = 'UNSPECIFIED'
    /**
     * @generated from protobuf enum value: KEY_PURPOSE_SIGNING = 1;
     */
    KeyPurpose[(KeyPurpose['SIGNING'] = 1)] = 'SIGNING'
    /**
     * @generated from protobuf enum value: KEY_PURPOSE_ENCRYPTION = 2;
     */
    KeyPurpose[(KeyPurpose['ENCRYPTION'] = 2)] = 'ENCRYPTION'
})(KeyPurpose || (KeyPurpose = {}))
/**
 * @generated from protobuf enum com.digitalasset.canton.crypto.v30.SigningKeyUsage
 */
export var SigningKeyUsage
;(function (SigningKeyUsage) {
    /**
     * @generated from protobuf enum value: SIGNING_KEY_USAGE_UNSPECIFIED = 0;
     */
    SigningKeyUsage[(SigningKeyUsage['UNSPECIFIED'] = 0)] = 'UNSPECIFIED'
    /**
     * the root namespace key that defines a node's identity and signs topology requests
     *
     * @generated from protobuf enum value: SIGNING_KEY_USAGE_NAMESPACE = 1;
     */
    SigningKeyUsage[(SigningKeyUsage['NAMESPACE'] = 1)] = 'NAMESPACE'
    /**
     * No longer used (only kept for backwards compatibility)
     *
     * @deprecated
     * @generated from protobuf enum value: SIGNING_KEY_USAGE_IDENTITY_DELEGATION = 2 [deprecated = true];
     */
    SigningKeyUsage[(SigningKeyUsage['IDENTITY_DELEGATION'] = 2)] =
        'IDENTITY_DELEGATION'
    /**
     * keys that authenticate members of the network towards a sequencer
     *
     * @generated from protobuf enum value: SIGNING_KEY_USAGE_SEQUENCER_AUTHENTICATION = 3;
     */
    SigningKeyUsage[(SigningKeyUsage['SEQUENCER_AUTHENTICATION'] = 3)] =
        'SEQUENCER_AUTHENTICATION'
    /**
     * keys that deal with all the signing that happens as part of the protocol
     *
     * @generated from protobuf enum value: SIGNING_KEY_USAGE_PROTOCOL = 4;
     */
    SigningKeyUsage[(SigningKeyUsage['PROTOCOL'] = 4)] = 'PROTOCOL'
    /**
     * used internally to identify keys that can self-sign to prove ownership
     *
     * @generated from protobuf enum value: SIGNING_KEY_USAGE_PROOF_OF_OWNERSHIP = 5;
     */
    SigningKeyUsage[(SigningKeyUsage['PROOF_OF_OWNERSHIP'] = 5)] =
        'PROOF_OF_OWNERSHIP'
})(SigningKeyUsage || (SigningKeyUsage = {}))
/**
 * @generated from protobuf enum com.digitalasset.canton.crypto.v30.SigningAlgorithmSpec
 */
export var SigningAlgorithmSpec
;(function (SigningAlgorithmSpec) {
    /**
     * @generated from protobuf enum value: SIGNING_ALGORITHM_SPEC_UNSPECIFIED = 0;
     */
    SigningAlgorithmSpec[(SigningAlgorithmSpec['UNSPECIFIED'] = 0)] =
        'UNSPECIFIED'
    /**
     * EdDSA Signature based on Curve25519 with SHA-512
     * http://ed25519.cr.yp.to/
     *
     * @generated from protobuf enum value: SIGNING_ALGORITHM_SPEC_ED25519 = 1;
     */
    SigningAlgorithmSpec[(SigningAlgorithmSpec['ED25519'] = 1)] = 'ED25519'
    /**
     * Elliptic Curve Digital Signature Algorithm with SHA256
     *
     * @generated from protobuf enum value: SIGNING_ALGORITHM_SPEC_EC_DSA_SHA_256 = 2;
     */
    SigningAlgorithmSpec[(SigningAlgorithmSpec['EC_DSA_SHA_256'] = 2)] =
        'EC_DSA_SHA_256'
    /**
     * Elliptic Curve Digital Signature Algorithm with SHA384
     *
     * @generated from protobuf enum value: SIGNING_ALGORITHM_SPEC_EC_DSA_SHA_384 = 3;
     */
    SigningAlgorithmSpec[(SigningAlgorithmSpec['EC_DSA_SHA_384'] = 3)] =
        'EC_DSA_SHA_384'
})(SigningAlgorithmSpec || (SigningAlgorithmSpec = {}))
/**
 * @deprecated
 *
 * @generated from protobuf enum com.digitalasset.canton.crypto.v30.SigningKeyScheme
 */
export var SigningKeyScheme
;(function (SigningKeyScheme) {
    /**
     * @generated from protobuf enum value: SIGNING_KEY_SCHEME_UNSPECIFIED = 0;
     */
    SigningKeyScheme[(SigningKeyScheme['UNSPECIFIED'] = 0)] = 'UNSPECIFIED'
    /**
     * Signature based on Curve25519
     * http://ed25519.cr.yp.to/
     *
     * @generated from protobuf enum value: SIGNING_KEY_SCHEME_ED25519 = 1;
     */
    SigningKeyScheme[(SigningKeyScheme['ED25519'] = 1)] = 'ED25519'
    /**
     * EC-DSA with NIST curve P-256 or P-384
     *
     * @generated from protobuf enum value: SIGNING_KEY_SCHEME_EC_DSA_P256 = 2;
     */
    SigningKeyScheme[(SigningKeyScheme['EC_DSA_P256'] = 2)] = 'EC_DSA_P256'
    /**
     * @generated from protobuf enum value: SIGNING_KEY_SCHEME_EC_DSA_P384 = 3;
     */
    SigningKeyScheme[(SigningKeyScheme['EC_DSA_P384'] = 3)] = 'EC_DSA_P384'
})(SigningKeyScheme || (SigningKeyScheme = {}))
/**
 * @generated from protobuf enum com.digitalasset.canton.crypto.v30.EncryptionAlgorithmSpec
 */
export var EncryptionAlgorithmSpec
;(function (EncryptionAlgorithmSpec) {
    /**
     * @generated from protobuf enum value: ENCRYPTION_ALGORITHM_SPEC_UNSPECIFIED = 0;
     */
    EncryptionAlgorithmSpec[(EncryptionAlgorithmSpec['UNSPECIFIED'] = 0)] =
        'UNSPECIFIED'
    /**
     * ECIES with ECDH, AES128 GCM, and HKDF and authentication (MAC) with HMAC-SHA256. This requires a P-256 key
     * because we use SHA256 and we need to align the lengths of the curve and the hash function.
     *
     * @generated from protobuf enum value: ENCRYPTION_ALGORITHM_SPEC_ECIES_HKDF_HMAC_SHA256_AES128GCM = 1;
     */
    EncryptionAlgorithmSpec[
        (EncryptionAlgorithmSpec['ECIES_HKDF_HMAC_SHA256_AES128GCM'] = 1)
    ] = 'ECIES_HKDF_HMAC_SHA256_AES128GCM'
    /**
     * ECIES with ECDH, AES128 CBC, and HKDF and authentication (MAC) with HMAC-SHA256. This requires a P-256 key
     * because we use SHA256 and we need to align the lengths of the curve the and hash function.
     *
     * @generated from protobuf enum value: ENCRYPTION_ALGORITHM_SPEC_ECIES_HKDF_HMAC_SHA256_AES128CBC = 2;
     */
    EncryptionAlgorithmSpec[
        (EncryptionAlgorithmSpec['ECIES_HKDF_HMAC_SHA256_AES128CBC'] = 2)
    ] = 'ECIES_HKDF_HMAC_SHA256_AES128CBC'
    /**
     * RSA with OAEP Padding,
     * using SHA-256 for both the hash and in the MGF1 mask generation function along with an empty label.
     *
     * @generated from protobuf enum value: ENCRYPTION_ALGORITHM_SPEC_RSA_OAEP_SHA256 = 3;
     */
    EncryptionAlgorithmSpec[(EncryptionAlgorithmSpec['RSA_OAEP_SHA256'] = 3)] =
        'RSA_OAEP_SHA256'
})(EncryptionAlgorithmSpec || (EncryptionAlgorithmSpec = {}))
/**
 * @deprecated
 *
 * @generated from protobuf enum com.digitalasset.canton.crypto.v30.EncryptionKeyScheme
 */
export var EncryptionKeyScheme
;(function (EncryptionKeyScheme) {
    /**
     * @generated from protobuf enum value: ENCRYPTION_KEY_SCHEME_UNSPECIFIED = 0;
     */
    EncryptionKeyScheme[(EncryptionKeyScheme['UNSPECIFIED'] = 0)] =
        'UNSPECIFIED'
    /**
     * ECIES with ECDH over NIST P-256, AES128 GCM, and HKDF with HMAC-SHA256
     *
     * @generated from protobuf enum value: ENCRYPTION_KEY_SCHEME_ECIES_P256_HKDF_HMAC_SHA256_AES128GCM = 1;
     */
    EncryptionKeyScheme[
        (EncryptionKeyScheme['ECIES_P256_HKDF_HMAC_SHA256_AES128GCM'] = 1)
    ] = 'ECIES_P256_HKDF_HMAC_SHA256_AES128GCM'
    /**
     * ECIES with ECDH over NIST P-256, AES128 CBC, and HKDF and authentication with HMAC-SHA256
     *
     * @generated from protobuf enum value: ENCRYPTION_KEY_SCHEME_ECIES_P256_HMAC_SHA256A_ES128CBC = 2;
     */
    EncryptionKeyScheme[
        (EncryptionKeyScheme['ECIES_P256_HMAC_SHA256A_ES128CBC'] = 2)
    ] = 'ECIES_P256_HMAC_SHA256A_ES128CBC'
    /**
     * RSA with a 2048 bit key with OAEP Padding,
     * using SHA-256 for both the hash and in the MGF1 mask generation function along with an empty label.
     *
     * @generated from protobuf enum value: ENCRYPTION_KEY_SCHEME_RSA2048_OAEP_SHA256 = 3;
     */
    EncryptionKeyScheme[(EncryptionKeyScheme['RSA2048_OAEP_SHA256'] = 3)] =
        'RSA2048_OAEP_SHA256'
})(EncryptionKeyScheme || (EncryptionKeyScheme = {}))
/**
 * @generated from protobuf enum com.digitalasset.canton.crypto.v30.SymmetricKeyScheme
 */
export var SymmetricKeyScheme
;(function (SymmetricKeyScheme) {
    /**
     * @generated from protobuf enum value: SYMMETRIC_KEY_SCHEME_UNSPECIFIED = 0;
     */
    SymmetricKeyScheme[(SymmetricKeyScheme['UNSPECIFIED'] = 0)] = 'UNSPECIFIED'
    /**
     * AES with 128bit keys in GCM
     *
     * @generated from protobuf enum value: SYMMETRIC_KEY_SCHEME_AES128GCM = 1;
     */
    SymmetricKeyScheme[(SymmetricKeyScheme['AES128GCM'] = 1)] = 'AES128GCM'
})(SymmetricKeyScheme || (SymmetricKeyScheme = {}))
/**
 * Serialization format for crypto keys and signatures
 *
 * @generated from protobuf enum com.digitalasset.canton.crypto.v30.CryptoKeyFormat
 */
export var CryptoKeyFormat
;(function (CryptoKeyFormat) {
    /**
     * @generated from protobuf enum value: CRYPTO_KEY_FORMAT_UNSPECIFIED = 0;
     */
    CryptoKeyFormat[(CryptoKeyFormat['UNSPECIFIED'] = 0)] = 'UNSPECIFIED'
    /**
     * ASN.1 + DER encoding
     * Legacy format no longer used, except for migrations
     *
     * @generated from protobuf enum value: CRYPTO_KEY_FORMAT_DER = 2;
     */
    CryptoKeyFormat[(CryptoKeyFormat['DER'] = 2)] = 'DER'
    /**
     * Raw encoding of a key, used for symmetric keys
     *
     * @generated from protobuf enum value: CRYPTO_KEY_FORMAT_RAW = 3;
     */
    CryptoKeyFormat[(CryptoKeyFormat['RAW'] = 3)] = 'RAW'
    /**
     * ASN.1 + DER-encoding of X.509 SubjectPublicKeyInfo structure: https://datatracker.ietf.org/doc/html/rfc5280#section-4.1
     *
     * @generated from protobuf enum value: CRYPTO_KEY_FORMAT_DER_X509_SUBJECT_PUBLIC_KEY_INFO = 4;
     */
    CryptoKeyFormat[(CryptoKeyFormat['DER_X509_SUBJECT_PUBLIC_KEY_INFO'] = 4)] =
        'DER_X509_SUBJECT_PUBLIC_KEY_INFO'
    /**
     * ASN.1 + DER-encoding of PKCS #8 PrivateKeyInfo structure: https://datatracker.ietf.org/doc/html/rfc5208#section-5
     *
     * @generated from protobuf enum value: CRYPTO_KEY_FORMAT_DER_PKCS8_PRIVATE_KEY_INFO = 5;
     */
    CryptoKeyFormat[(CryptoKeyFormat['DER_PKCS8_PRIVATE_KEY_INFO'] = 5)] =
        'DER_PKCS8_PRIVATE_KEY_INFO'
    /**
     * Symbolic crypto, must only be used for testing
     *
     * @generated from protobuf enum value: CRYPTO_KEY_FORMAT_SYMBOLIC = 10000;
     */
    CryptoKeyFormat[(CryptoKeyFormat['SYMBOLIC'] = 10000)] = 'SYMBOLIC'
})(CryptoKeyFormat || (CryptoKeyFormat = {}))
/**
 * @generated from protobuf enum com.digitalasset.canton.crypto.v30.PbkdfScheme
 */
export var PbkdfScheme
;(function (PbkdfScheme) {
    /**
     * @generated from protobuf enum value: PBKDF_SCHEME_UNSPECIFIED = 0;
     */
    PbkdfScheme[(PbkdfScheme['UNSPECIFIED'] = 0)] = 'UNSPECIFIED'
    /**
     * Argon2id with m=12288 (12 MiB), t=3, p=1
     *
     * @generated from protobuf enum value: PBKDF_SCHEME_ARGON2ID_MODE1 = 1;
     */
    PbkdfScheme[(PbkdfScheme['ARGON2ID_MODE1'] = 1)] = 'ARGON2ID_MODE1'
})(PbkdfScheme || (PbkdfScheme = {}))
// @generated message type with reflection information, may provide speed optimized methods
class Hmac$Type extends MessageType {
    constructor() {
        super('com.digitalasset.canton.crypto.v30.Hmac', [
            {
                no: 1,
                name: 'algorithm',
                kind: 'enum',
                T: () => [
                    'com.digitalasset.canton.crypto.v30.HmacAlgorithm',
                    HmacAlgorithm,
                    'HMAC_ALGORITHM_',
                ],
            },
            { no: 2, name: 'hmac', kind: 'scalar', T: 12 /*ScalarType.BYTES*/ },
        ])
    }
    create(value) {
        const message = globalThis.Object.create(this.messagePrototype)
        message.algorithm = 0
        message.hmac = new Uint8Array(0)
        if (value !== undefined) reflectionMergePartial(this, message, value)
        return message
    }
    internalBinaryRead(reader, length, options, target) {
        const message = target ?? this.create(),
            end = reader.pos + length
        while (reader.pos < end) {
            const [fieldNo, wireType] = reader.tag()
            switch (fieldNo) {
                case /* com.digitalasset.canton.crypto.v30.HmacAlgorithm algorithm */ 1:
                    message.algorithm = reader.int32()
                    break
                case /* bytes hmac */ 2:
                    message.hmac = reader.bytes()
                    break
                default:
                    const u = options.readUnknownField
                    if (u === 'throw')
                        throw new globalThis.Error(
                            `Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`
                        )
                    const d = reader.skip(wireType)
                    if (u !== false)
                        (u === true ? UnknownFieldHandler.onRead : u)(
                            this.typeName,
                            message,
                            fieldNo,
                            wireType,
                            d
                        )
            }
        }
        return message
    }
    internalBinaryWrite(message, writer, options) {
        /* com.digitalasset.canton.crypto.v30.HmacAlgorithm algorithm = 1; */
        if (message.algorithm !== 0)
            writer.tag(1, WireType.Varint).int32(message.algorithm)
        /* bytes hmac = 2; */
        if (message.hmac.length)
            writer.tag(2, WireType.LengthDelimited).bytes(message.hmac)
        const u = options.writeUnknownFields
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(
                this.typeName,
                message,
                writer
            )
        return writer
    }
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.crypto.v30.Hmac
 */
export const Hmac = new Hmac$Type()
// @generated message type with reflection information, may provide speed optimized methods
class Salt$Type extends MessageType {
    constructor() {
        super('com.digitalasset.canton.crypto.v30.Salt', [
            {
                no: 1,
                name: 'hmac',
                kind: 'enum',
                oneof: 'algorithm',
                T: () => [
                    'com.digitalasset.canton.crypto.v30.HmacAlgorithm',
                    HmacAlgorithm,
                    'HMAC_ALGORITHM_',
                ],
            },
            { no: 2, name: 'salt', kind: 'scalar', T: 12 /*ScalarType.BYTES*/ },
        ])
    }
    create(value) {
        const message = globalThis.Object.create(this.messagePrototype)
        message.algorithm = { oneofKind: undefined }
        message.salt = new Uint8Array(0)
        if (value !== undefined) reflectionMergePartial(this, message, value)
        return message
    }
    internalBinaryRead(reader, length, options, target) {
        const message = target ?? this.create(),
            end = reader.pos + length
        while (reader.pos < end) {
            const [fieldNo, wireType] = reader.tag()
            switch (fieldNo) {
                case /* com.digitalasset.canton.crypto.v30.HmacAlgorithm hmac */ 1:
                    message.algorithm = {
                        oneofKind: 'hmac',
                        hmac: reader.int32(),
                    }
                    break
                case /* bytes salt */ 2:
                    message.salt = reader.bytes()
                    break
                default:
                    const u = options.readUnknownField
                    if (u === 'throw')
                        throw new globalThis.Error(
                            `Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`
                        )
                    const d = reader.skip(wireType)
                    if (u !== false)
                        (u === true ? UnknownFieldHandler.onRead : u)(
                            this.typeName,
                            message,
                            fieldNo,
                            wireType,
                            d
                        )
            }
        }
        return message
    }
    internalBinaryWrite(message, writer, options) {
        /* com.digitalasset.canton.crypto.v30.HmacAlgorithm hmac = 1; */
        if (message.algorithm.oneofKind === 'hmac')
            writer.tag(1, WireType.Varint).int32(message.algorithm.hmac)
        /* bytes salt = 2; */
        if (message.salt.length)
            writer.tag(2, WireType.LengthDelimited).bytes(message.salt)
        const u = options.writeUnknownFields
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(
                this.typeName,
                message,
                writer
            )
        return writer
    }
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.crypto.v30.Salt
 */
export const Salt = new Salt$Type()
// @generated message type with reflection information, may provide speed optimized methods
class Signature$Type extends MessageType {
    constructor() {
        super('com.digitalasset.canton.crypto.v30.Signature', [
            {
                no: 1,
                name: 'format',
                kind: 'enum',
                T: () => [
                    'com.digitalasset.canton.crypto.v30.SignatureFormat',
                    SignatureFormat,
                    'SIGNATURE_FORMAT_',
                ],
            },
            {
                no: 2,
                name: 'signature',
                kind: 'scalar',
                T: 12 /*ScalarType.BYTES*/,
            },
            {
                no: 3,
                name: 'signed_by',
                kind: 'scalar',
                T: 9 /*ScalarType.STRING*/,
            },
            {
                no: 4,
                name: 'signing_algorithm_spec',
                kind: 'enum',
                T: () => [
                    'com.digitalasset.canton.crypto.v30.SigningAlgorithmSpec',
                    SigningAlgorithmSpec,
                    'SIGNING_ALGORITHM_SPEC_',
                ],
            },
            {
                no: 5,
                name: 'signature_delegation',
                kind: 'message',
                T: () => SignatureDelegation,
            },
        ])
    }
    create(value) {
        const message = globalThis.Object.create(this.messagePrototype)
        message.format = 0
        message.signature = new Uint8Array(0)
        message.signedBy = ''
        message.signingAlgorithmSpec = 0
        if (value !== undefined) reflectionMergePartial(this, message, value)
        return message
    }
    internalBinaryRead(reader, length, options, target) {
        const message = target ?? this.create(),
            end = reader.pos + length
        while (reader.pos < end) {
            const [fieldNo, wireType] = reader.tag()
            switch (fieldNo) {
                case /* com.digitalasset.canton.crypto.v30.SignatureFormat format */ 1:
                    message.format = reader.int32()
                    break
                case /* bytes signature */ 2:
                    message.signature = reader.bytes()
                    break
                case /* string signed_by */ 3:
                    message.signedBy = reader.string()
                    break
                case /* com.digitalasset.canton.crypto.v30.SigningAlgorithmSpec signing_algorithm_spec */ 4:
                    message.signingAlgorithmSpec = reader.int32()
                    break
                case /* optional com.digitalasset.canton.crypto.v30.SignatureDelegation signature_delegation */ 5:
                    message.signatureDelegation =
                        SignatureDelegation.internalBinaryRead(
                            reader,
                            reader.uint32(),
                            options,
                            message.signatureDelegation
                        )
                    break
                default:
                    const u = options.readUnknownField
                    if (u === 'throw')
                        throw new globalThis.Error(
                            `Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`
                        )
                    const d = reader.skip(wireType)
                    if (u !== false)
                        (u === true ? UnknownFieldHandler.onRead : u)(
                            this.typeName,
                            message,
                            fieldNo,
                            wireType,
                            d
                        )
            }
        }
        return message
    }
    internalBinaryWrite(message, writer, options) {
        /* com.digitalasset.canton.crypto.v30.SignatureFormat format = 1; */
        if (message.format !== 0)
            writer.tag(1, WireType.Varint).int32(message.format)
        /* bytes signature = 2; */
        if (message.signature.length)
            writer.tag(2, WireType.LengthDelimited).bytes(message.signature)
        /* string signed_by = 3; */
        if (message.signedBy !== '')
            writer.tag(3, WireType.LengthDelimited).string(message.signedBy)
        /* com.digitalasset.canton.crypto.v30.SigningAlgorithmSpec signing_algorithm_spec = 4; */
        if (message.signingAlgorithmSpec !== 0)
            writer.tag(4, WireType.Varint).int32(message.signingAlgorithmSpec)
        /* optional com.digitalasset.canton.crypto.v30.SignatureDelegation signature_delegation = 5; */
        if (message.signatureDelegation)
            SignatureDelegation.internalBinaryWrite(
                message.signatureDelegation,
                writer.tag(5, WireType.LengthDelimited).fork(),
                options
            ).join()
        const u = options.writeUnknownFields
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(
                this.typeName,
                message,
                writer
            )
        return writer
    }
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.crypto.v30.Signature
 */
export const Signature = new Signature$Type()
// @generated message type with reflection information, may provide speed optimized methods
class SignatureDelegation$Type extends MessageType {
    constructor() {
        super('com.digitalasset.canton.crypto.v30.SignatureDelegation', [
            {
                no: 1,
                name: 'session_key',
                kind: 'scalar',
                T: 12 /*ScalarType.BYTES*/,
            },
            {
                no: 2,
                name: 'session_key_spec',
                kind: 'enum',
                T: () => [
                    'com.digitalasset.canton.crypto.v30.SigningKeySpec',
                    SigningKeySpec,
                    'SIGNING_KEY_SPEC_',
                ],
            },
            {
                no: 3,
                name: 'validity_period_from_inclusive',
                kind: 'scalar',
                T: 3 /*ScalarType.INT64*/,
                L: 0 /*LongType.BIGINT*/,
            },
            {
                no: 4,
                name: 'validity_period_duration_seconds',
                kind: 'scalar',
                T: 13 /*ScalarType.UINT32*/,
            },
            {
                no: 5,
                name: 'format',
                kind: 'enum',
                T: () => [
                    'com.digitalasset.canton.crypto.v30.SignatureFormat',
                    SignatureFormat,
                    'SIGNATURE_FORMAT_',
                ],
            },
            {
                no: 6,
                name: 'signature',
                kind: 'scalar',
                T: 12 /*ScalarType.BYTES*/,
            },
            {
                no: 7,
                name: 'signing_algorithm_spec',
                kind: 'enum',
                T: () => [
                    'com.digitalasset.canton.crypto.v30.SigningAlgorithmSpec',
                    SigningAlgorithmSpec,
                    'SIGNING_ALGORITHM_SPEC_',
                ],
            },
        ])
    }
    create(value) {
        const message = globalThis.Object.create(this.messagePrototype)
        message.sessionKey = new Uint8Array(0)
        message.sessionKeySpec = 0
        message.validityPeriodFromInclusive = 0n
        message.validityPeriodDurationSeconds = 0
        message.format = 0
        message.signature = new Uint8Array(0)
        message.signingAlgorithmSpec = 0
        if (value !== undefined) reflectionMergePartial(this, message, value)
        return message
    }
    internalBinaryRead(reader, length, options, target) {
        const message = target ?? this.create(),
            end = reader.pos + length
        while (reader.pos < end) {
            const [fieldNo, wireType] = reader.tag()
            switch (fieldNo) {
                case /* bytes session_key */ 1:
                    message.sessionKey = reader.bytes()
                    break
                case /* com.digitalasset.canton.crypto.v30.SigningKeySpec session_key_spec */ 2:
                    message.sessionKeySpec = reader.int32()
                    break
                case /* int64 validity_period_from_inclusive */ 3:
                    message.validityPeriodFromInclusive = reader
                        .int64()
                        .toBigInt()
                    break
                case /* uint32 validity_period_duration_seconds */ 4:
                    message.validityPeriodDurationSeconds = reader.uint32()
                    break
                case /* com.digitalasset.canton.crypto.v30.SignatureFormat format */ 5:
                    message.format = reader.int32()
                    break
                case /* bytes signature */ 6:
                    message.signature = reader.bytes()
                    break
                case /* com.digitalasset.canton.crypto.v30.SigningAlgorithmSpec signing_algorithm_spec */ 7:
                    message.signingAlgorithmSpec = reader.int32()
                    break
                default:
                    const u = options.readUnknownField
                    if (u === 'throw')
                        throw new globalThis.Error(
                            `Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`
                        )
                    const d = reader.skip(wireType)
                    if (u !== false)
                        (u === true ? UnknownFieldHandler.onRead : u)(
                            this.typeName,
                            message,
                            fieldNo,
                            wireType,
                            d
                        )
            }
        }
        return message
    }
    internalBinaryWrite(message, writer, options) {
        /* bytes session_key = 1; */
        if (message.sessionKey.length)
            writer.tag(1, WireType.LengthDelimited).bytes(message.sessionKey)
        /* com.digitalasset.canton.crypto.v30.SigningKeySpec session_key_spec = 2; */
        if (message.sessionKeySpec !== 0)
            writer.tag(2, WireType.Varint).int32(message.sessionKeySpec)
        /* int64 validity_period_from_inclusive = 3; */
        if (message.validityPeriodFromInclusive !== 0n)
            writer
                .tag(3, WireType.Varint)
                .int64(message.validityPeriodFromInclusive)
        /* uint32 validity_period_duration_seconds = 4; */
        if (message.validityPeriodDurationSeconds !== 0)
            writer
                .tag(4, WireType.Varint)
                .uint32(message.validityPeriodDurationSeconds)
        /* com.digitalasset.canton.crypto.v30.SignatureFormat format = 5; */
        if (message.format !== 0)
            writer.tag(5, WireType.Varint).int32(message.format)
        /* bytes signature = 6; */
        if (message.signature.length)
            writer.tag(6, WireType.LengthDelimited).bytes(message.signature)
        /* com.digitalasset.canton.crypto.v30.SigningAlgorithmSpec signing_algorithm_spec = 7; */
        if (message.signingAlgorithmSpec !== 0)
            writer.tag(7, WireType.Varint).int32(message.signingAlgorithmSpec)
        const u = options.writeUnknownFields
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(
                this.typeName,
                message,
                writer
            )
        return writer
    }
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.crypto.v30.SignatureDelegation
 */
export const SignatureDelegation = new SignatureDelegation$Type()
// @generated message type with reflection information, may provide speed optimized methods
class PublicKey$Type extends MessageType {
    constructor() {
        super('com.digitalasset.canton.crypto.v30.PublicKey', [
            {
                no: 1,
                name: 'signing_public_key',
                kind: 'message',
                oneof: 'key',
                T: () => SigningPublicKey,
            },
            {
                no: 2,
                name: 'encryption_public_key',
                kind: 'message',
                oneof: 'key',
                T: () => EncryptionPublicKey,
            },
        ])
    }
    create(value) {
        const message = globalThis.Object.create(this.messagePrototype)
        message.key = { oneofKind: undefined }
        if (value !== undefined) reflectionMergePartial(this, message, value)
        return message
    }
    internalBinaryRead(reader, length, options, target) {
        const message = target ?? this.create(),
            end = reader.pos + length
        while (reader.pos < end) {
            const [fieldNo, wireType] = reader.tag()
            switch (fieldNo) {
                case /* com.digitalasset.canton.crypto.v30.SigningPublicKey signing_public_key */ 1:
                    message.key = {
                        oneofKind: 'signingPublicKey',
                        signingPublicKey: SigningPublicKey.internalBinaryRead(
                            reader,
                            reader.uint32(),
                            options,
                            message.key.signingPublicKey
                        ),
                    }
                    break
                case /* com.digitalasset.canton.crypto.v30.EncryptionPublicKey encryption_public_key */ 2:
                    message.key = {
                        oneofKind: 'encryptionPublicKey',
                        encryptionPublicKey:
                            EncryptionPublicKey.internalBinaryRead(
                                reader,
                                reader.uint32(),
                                options,
                                message.key.encryptionPublicKey
                            ),
                    }
                    break
                default:
                    const u = options.readUnknownField
                    if (u === 'throw')
                        throw new globalThis.Error(
                            `Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`
                        )
                    const d = reader.skip(wireType)
                    if (u !== false)
                        (u === true ? UnknownFieldHandler.onRead : u)(
                            this.typeName,
                            message,
                            fieldNo,
                            wireType,
                            d
                        )
            }
        }
        return message
    }
    internalBinaryWrite(message, writer, options) {
        /* com.digitalasset.canton.crypto.v30.SigningPublicKey signing_public_key = 1; */
        if (message.key.oneofKind === 'signingPublicKey')
            SigningPublicKey.internalBinaryWrite(
                message.key.signingPublicKey,
                writer.tag(1, WireType.LengthDelimited).fork(),
                options
            ).join()
        /* com.digitalasset.canton.crypto.v30.EncryptionPublicKey encryption_public_key = 2; */
        if (message.key.oneofKind === 'encryptionPublicKey')
            EncryptionPublicKey.internalBinaryWrite(
                message.key.encryptionPublicKey,
                writer.tag(2, WireType.LengthDelimited).fork(),
                options
            ).join()
        const u = options.writeUnknownFields
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(
                this.typeName,
                message,
                writer
            )
        return writer
    }
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.crypto.v30.PublicKey
 */
export const PublicKey = new PublicKey$Type()
// @generated message type with reflection information, may provide speed optimized methods
class PublicKeyWithName$Type extends MessageType {
    constructor() {
        super('com.digitalasset.canton.crypto.v30.PublicKeyWithName', [
            { no: 1, name: 'public_key', kind: 'message', T: () => PublicKey },
            { no: 2, name: 'name', kind: 'scalar', T: 9 /*ScalarType.STRING*/ },
        ])
    }
    create(value) {
        const message = globalThis.Object.create(this.messagePrototype)
        message.name = ''
        if (value !== undefined) reflectionMergePartial(this, message, value)
        return message
    }
    internalBinaryRead(reader, length, options, target) {
        const message = target ?? this.create(),
            end = reader.pos + length
        while (reader.pos < end) {
            const [fieldNo, wireType] = reader.tag()
            switch (fieldNo) {
                case /* com.digitalasset.canton.crypto.v30.PublicKey public_key */ 1:
                    message.publicKey = PublicKey.internalBinaryRead(
                        reader,
                        reader.uint32(),
                        options,
                        message.publicKey
                    )
                    break
                case /* string name */ 2:
                    message.name = reader.string()
                    break
                default:
                    const u = options.readUnknownField
                    if (u === 'throw')
                        throw new globalThis.Error(
                            `Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`
                        )
                    const d = reader.skip(wireType)
                    if (u !== false)
                        (u === true ? UnknownFieldHandler.onRead : u)(
                            this.typeName,
                            message,
                            fieldNo,
                            wireType,
                            d
                        )
            }
        }
        return message
    }
    internalBinaryWrite(message, writer, options) {
        /* com.digitalasset.canton.crypto.v30.PublicKey public_key = 1; */
        if (message.publicKey)
            PublicKey.internalBinaryWrite(
                message.publicKey,
                writer.tag(1, WireType.LengthDelimited).fork(),
                options
            ).join()
        /* string name = 2; */
        if (message.name !== '')
            writer.tag(2, WireType.LengthDelimited).string(message.name)
        const u = options.writeUnknownFields
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(
                this.typeName,
                message,
                writer
            )
        return writer
    }
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.crypto.v30.PublicKeyWithName
 */
export const PublicKeyWithName = new PublicKeyWithName$Type()
// @generated message type with reflection information, may provide speed optimized methods
class PrivateKey$Type extends MessageType {
    constructor() {
        super('com.digitalasset.canton.crypto.v30.PrivateKey', [
            {
                no: 1,
                name: 'signing_private_key',
                kind: 'message',
                oneof: 'key',
                T: () => SigningPrivateKey,
            },
            {
                no: 2,
                name: 'encryption_private_key',
                kind: 'message',
                oneof: 'key',
                T: () => EncryptionPrivateKey,
            },
        ])
    }
    create(value) {
        const message = globalThis.Object.create(this.messagePrototype)
        message.key = { oneofKind: undefined }
        if (value !== undefined) reflectionMergePartial(this, message, value)
        return message
    }
    internalBinaryRead(reader, length, options, target) {
        const message = target ?? this.create(),
            end = reader.pos + length
        while (reader.pos < end) {
            const [fieldNo, wireType] = reader.tag()
            switch (fieldNo) {
                case /* com.digitalasset.canton.crypto.v30.SigningPrivateKey signing_private_key */ 1:
                    message.key = {
                        oneofKind: 'signingPrivateKey',
                        signingPrivateKey: SigningPrivateKey.internalBinaryRead(
                            reader,
                            reader.uint32(),
                            options,
                            message.key.signingPrivateKey
                        ),
                    }
                    break
                case /* com.digitalasset.canton.crypto.v30.EncryptionPrivateKey encryption_private_key */ 2:
                    message.key = {
                        oneofKind: 'encryptionPrivateKey',
                        encryptionPrivateKey:
                            EncryptionPrivateKey.internalBinaryRead(
                                reader,
                                reader.uint32(),
                                options,
                                message.key.encryptionPrivateKey
                            ),
                    }
                    break
                default:
                    const u = options.readUnknownField
                    if (u === 'throw')
                        throw new globalThis.Error(
                            `Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`
                        )
                    const d = reader.skip(wireType)
                    if (u !== false)
                        (u === true ? UnknownFieldHandler.onRead : u)(
                            this.typeName,
                            message,
                            fieldNo,
                            wireType,
                            d
                        )
            }
        }
        return message
    }
    internalBinaryWrite(message, writer, options) {
        /* com.digitalasset.canton.crypto.v30.SigningPrivateKey signing_private_key = 1; */
        if (message.key.oneofKind === 'signingPrivateKey')
            SigningPrivateKey.internalBinaryWrite(
                message.key.signingPrivateKey,
                writer.tag(1, WireType.LengthDelimited).fork(),
                options
            ).join()
        /* com.digitalasset.canton.crypto.v30.EncryptionPrivateKey encryption_private_key = 2; */
        if (message.key.oneofKind === 'encryptionPrivateKey')
            EncryptionPrivateKey.internalBinaryWrite(
                message.key.encryptionPrivateKey,
                writer.tag(2, WireType.LengthDelimited).fork(),
                options
            ).join()
        const u = options.writeUnknownFields
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(
                this.typeName,
                message,
                writer
            )
        return writer
    }
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.crypto.v30.PrivateKey
 */
export const PrivateKey = new PrivateKey$Type()
// @generated message type with reflection information, may provide speed optimized methods
class SigningPublicKey$Type extends MessageType {
    constructor() {
        super('com.digitalasset.canton.crypto.v30.SigningPublicKey', [
            {
                no: 2,
                name: 'format',
                kind: 'enum',
                T: () => [
                    'com.digitalasset.canton.crypto.v30.CryptoKeyFormat',
                    CryptoKeyFormat,
                    'CRYPTO_KEY_FORMAT_',
                ],
            },
            {
                no: 3,
                name: 'public_key',
                kind: 'scalar',
                T: 12 /*ScalarType.BYTES*/,
            },
            {
                no: 4,
                name: 'scheme',
                kind: 'enum',
                T: () => [
                    'com.digitalasset.canton.crypto.v30.SigningKeyScheme',
                    SigningKeyScheme,
                    'SIGNING_KEY_SCHEME_',
                ],
            },
            {
                no: 5,
                name: 'usage',
                kind: 'enum',
                repeat: 1 /*RepeatType.PACKED*/,
                T: () => [
                    'com.digitalasset.canton.crypto.v30.SigningKeyUsage',
                    SigningKeyUsage,
                    'SIGNING_KEY_USAGE_',
                ],
            },
            {
                no: 6,
                name: 'key_spec',
                kind: 'enum',
                T: () => [
                    'com.digitalasset.canton.crypto.v30.SigningKeySpec',
                    SigningKeySpec,
                    'SIGNING_KEY_SPEC_',
                ],
            },
        ])
    }
    create(value) {
        const message = globalThis.Object.create(this.messagePrototype)
        message.format = 0
        message.publicKey = new Uint8Array(0)
        message.scheme = 0
        message.usage = []
        message.keySpec = 0
        if (value !== undefined) reflectionMergePartial(this, message, value)
        return message
    }
    internalBinaryRead(reader, length, options, target) {
        const message = target ?? this.create(),
            end = reader.pos + length
        while (reader.pos < end) {
            const [fieldNo, wireType] = reader.tag()
            switch (fieldNo) {
                case /* com.digitalasset.canton.crypto.v30.CryptoKeyFormat format */ 2:
                    message.format = reader.int32()
                    break
                case /* bytes public_key */ 3:
                    message.publicKey = reader.bytes()
                    break
                case /* com.digitalasset.canton.crypto.v30.SigningKeyScheme scheme = 4 [deprecated = true] */ 4:
                    message.scheme = reader.int32()
                    break
                case /* repeated com.digitalasset.canton.crypto.v30.SigningKeyUsage usage */ 5:
                    if (wireType === WireType.LengthDelimited)
                        for (
                            let e = reader.int32() + reader.pos;
                            reader.pos < e;

                        )
                            message.usage.push(reader.int32())
                    else message.usage.push(reader.int32())
                    break
                case /* com.digitalasset.canton.crypto.v30.SigningKeySpec key_spec */ 6:
                    message.keySpec = reader.int32()
                    break
                default:
                    const u = options.readUnknownField
                    if (u === 'throw')
                        throw new globalThis.Error(
                            `Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`
                        )
                    const d = reader.skip(wireType)
                    if (u !== false)
                        (u === true ? UnknownFieldHandler.onRead : u)(
                            this.typeName,
                            message,
                            fieldNo,
                            wireType,
                            d
                        )
            }
        }
        return message
    }
    internalBinaryWrite(message, writer, options) {
        /* com.digitalasset.canton.crypto.v30.CryptoKeyFormat format = 2; */
        if (message.format !== 0)
            writer.tag(2, WireType.Varint).int32(message.format)
        /* bytes public_key = 3; */
        if (message.publicKey.length)
            writer.tag(3, WireType.LengthDelimited).bytes(message.publicKey)
        /* com.digitalasset.canton.crypto.v30.SigningKeyScheme scheme = 4 [deprecated = true]; */
        if (message.scheme !== 0)
            writer.tag(4, WireType.Varint).int32(message.scheme)
        /* repeated com.digitalasset.canton.crypto.v30.SigningKeyUsage usage = 5; */
        if (message.usage.length) {
            writer.tag(5, WireType.LengthDelimited).fork()
            for (let i = 0; i < message.usage.length; i++)
                writer.int32(message.usage[i])
            writer.join()
        }
        /* com.digitalasset.canton.crypto.v30.SigningKeySpec key_spec = 6; */
        if (message.keySpec !== 0)
            writer.tag(6, WireType.Varint).int32(message.keySpec)
        const u = options.writeUnknownFields
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(
                this.typeName,
                message,
                writer
            )
        return writer
    }
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.crypto.v30.SigningPublicKey
 */
export const SigningPublicKey = new SigningPublicKey$Type()
// @generated message type with reflection information, may provide speed optimized methods
class SigningPrivateKey$Type extends MessageType {
    constructor() {
        super('com.digitalasset.canton.crypto.v30.SigningPrivateKey', [
            { no: 1, name: 'id', kind: 'scalar', T: 9 /*ScalarType.STRING*/ },
            {
                no: 2,
                name: 'format',
                kind: 'enum',
                T: () => [
                    'com.digitalasset.canton.crypto.v30.CryptoKeyFormat',
                    CryptoKeyFormat,
                    'CRYPTO_KEY_FORMAT_',
                ],
            },
            {
                no: 3,
                name: 'private_key',
                kind: 'scalar',
                T: 12 /*ScalarType.BYTES*/,
            },
            {
                no: 4,
                name: 'scheme',
                kind: 'enum',
                T: () => [
                    'com.digitalasset.canton.crypto.v30.SigningKeyScheme',
                    SigningKeyScheme,
                    'SIGNING_KEY_SCHEME_',
                ],
            },
            {
                no: 5,
                name: 'usage',
                kind: 'enum',
                repeat: 1 /*RepeatType.PACKED*/,
                T: () => [
                    'com.digitalasset.canton.crypto.v30.SigningKeyUsage',
                    SigningKeyUsage,
                    'SIGNING_KEY_USAGE_',
                ],
            },
            {
                no: 6,
                name: 'key_spec',
                kind: 'enum',
                T: () => [
                    'com.digitalasset.canton.crypto.v30.SigningKeySpec',
                    SigningKeySpec,
                    'SIGNING_KEY_SPEC_',
                ],
            },
        ])
    }
    create(value) {
        const message = globalThis.Object.create(this.messagePrototype)
        message.id = ''
        message.format = 0
        message.privateKey = new Uint8Array(0)
        message.scheme = 0
        message.usage = []
        message.keySpec = 0
        if (value !== undefined) reflectionMergePartial(this, message, value)
        return message
    }
    internalBinaryRead(reader, length, options, target) {
        const message = target ?? this.create(),
            end = reader.pos + length
        while (reader.pos < end) {
            const [fieldNo, wireType] = reader.tag()
            switch (fieldNo) {
                case /* string id */ 1:
                    message.id = reader.string()
                    break
                case /* com.digitalasset.canton.crypto.v30.CryptoKeyFormat format */ 2:
                    message.format = reader.int32()
                    break
                case /* bytes private_key */ 3:
                    message.privateKey = reader.bytes()
                    break
                case /* com.digitalasset.canton.crypto.v30.SigningKeyScheme scheme = 4 [deprecated = true] */ 4:
                    message.scheme = reader.int32()
                    break
                case /* repeated com.digitalasset.canton.crypto.v30.SigningKeyUsage usage */ 5:
                    if (wireType === WireType.LengthDelimited)
                        for (
                            let e = reader.int32() + reader.pos;
                            reader.pos < e;

                        )
                            message.usage.push(reader.int32())
                    else message.usage.push(reader.int32())
                    break
                case /* com.digitalasset.canton.crypto.v30.SigningKeySpec key_spec */ 6:
                    message.keySpec = reader.int32()
                    break
                default:
                    const u = options.readUnknownField
                    if (u === 'throw')
                        throw new globalThis.Error(
                            `Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`
                        )
                    const d = reader.skip(wireType)
                    if (u !== false)
                        (u === true ? UnknownFieldHandler.onRead : u)(
                            this.typeName,
                            message,
                            fieldNo,
                            wireType,
                            d
                        )
            }
        }
        return message
    }
    internalBinaryWrite(message, writer, options) {
        /* string id = 1; */
        if (message.id !== '')
            writer.tag(1, WireType.LengthDelimited).string(message.id)
        /* com.digitalasset.canton.crypto.v30.CryptoKeyFormat format = 2; */
        if (message.format !== 0)
            writer.tag(2, WireType.Varint).int32(message.format)
        /* bytes private_key = 3; */
        if (message.privateKey.length)
            writer.tag(3, WireType.LengthDelimited).bytes(message.privateKey)
        /* com.digitalasset.canton.crypto.v30.SigningKeyScheme scheme = 4 [deprecated = true]; */
        if (message.scheme !== 0)
            writer.tag(4, WireType.Varint).int32(message.scheme)
        /* repeated com.digitalasset.canton.crypto.v30.SigningKeyUsage usage = 5; */
        if (message.usage.length) {
            writer.tag(5, WireType.LengthDelimited).fork()
            for (let i = 0; i < message.usage.length; i++)
                writer.int32(message.usage[i])
            writer.join()
        }
        /* com.digitalasset.canton.crypto.v30.SigningKeySpec key_spec = 6; */
        if (message.keySpec !== 0)
            writer.tag(6, WireType.Varint).int32(message.keySpec)
        const u = options.writeUnknownFields
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(
                this.typeName,
                message,
                writer
            )
        return writer
    }
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.crypto.v30.SigningPrivateKey
 */
export const SigningPrivateKey = new SigningPrivateKey$Type()
// @generated message type with reflection information, may provide speed optimized methods
class SigningKeyPair$Type extends MessageType {
    constructor() {
        super('com.digitalasset.canton.crypto.v30.SigningKeyPair', [
            {
                no: 1,
                name: 'public_key',
                kind: 'message',
                T: () => SigningPublicKey,
            },
            {
                no: 2,
                name: 'private_key',
                kind: 'message',
                T: () => SigningPrivateKey,
            },
        ])
    }
    create(value) {
        const message = globalThis.Object.create(this.messagePrototype)
        if (value !== undefined) reflectionMergePartial(this, message, value)
        return message
    }
    internalBinaryRead(reader, length, options, target) {
        const message = target ?? this.create(),
            end = reader.pos + length
        while (reader.pos < end) {
            const [fieldNo, wireType] = reader.tag()
            switch (fieldNo) {
                case /* com.digitalasset.canton.crypto.v30.SigningPublicKey public_key */ 1:
                    message.publicKey = SigningPublicKey.internalBinaryRead(
                        reader,
                        reader.uint32(),
                        options,
                        message.publicKey
                    )
                    break
                case /* com.digitalasset.canton.crypto.v30.SigningPrivateKey private_key */ 2:
                    message.privateKey = SigningPrivateKey.internalBinaryRead(
                        reader,
                        reader.uint32(),
                        options,
                        message.privateKey
                    )
                    break
                default:
                    const u = options.readUnknownField
                    if (u === 'throw')
                        throw new globalThis.Error(
                            `Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`
                        )
                    const d = reader.skip(wireType)
                    if (u !== false)
                        (u === true ? UnknownFieldHandler.onRead : u)(
                            this.typeName,
                            message,
                            fieldNo,
                            wireType,
                            d
                        )
            }
        }
        return message
    }
    internalBinaryWrite(message, writer, options) {
        /* com.digitalasset.canton.crypto.v30.SigningPublicKey public_key = 1; */
        if (message.publicKey)
            SigningPublicKey.internalBinaryWrite(
                message.publicKey,
                writer.tag(1, WireType.LengthDelimited).fork(),
                options
            ).join()
        /* com.digitalasset.canton.crypto.v30.SigningPrivateKey private_key = 2; */
        if (message.privateKey)
            SigningPrivateKey.internalBinaryWrite(
                message.privateKey,
                writer.tag(2, WireType.LengthDelimited).fork(),
                options
            ).join()
        const u = options.writeUnknownFields
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(
                this.typeName,
                message,
                writer
            )
        return writer
    }
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.crypto.v30.SigningKeyPair
 */
export const SigningKeyPair = new SigningKeyPair$Type()
// @generated message type with reflection information, may provide speed optimized methods
class RequiredSigningSpecs$Type extends MessageType {
    constructor() {
        super('com.digitalasset.canton.crypto.v30.RequiredSigningSpecs', [
            {
                no: 1,
                name: 'algorithms',
                kind: 'enum',
                repeat: 1 /*RepeatType.PACKED*/,
                T: () => [
                    'com.digitalasset.canton.crypto.v30.SigningAlgorithmSpec',
                    SigningAlgorithmSpec,
                    'SIGNING_ALGORITHM_SPEC_',
                ],
            },
            {
                no: 2,
                name: 'keys',
                kind: 'enum',
                repeat: 1 /*RepeatType.PACKED*/,
                T: () => [
                    'com.digitalasset.canton.crypto.v30.SigningKeySpec',
                    SigningKeySpec,
                    'SIGNING_KEY_SPEC_',
                ],
            },
        ])
    }
    create(value) {
        const message = globalThis.Object.create(this.messagePrototype)
        message.algorithms = []
        message.keys = []
        if (value !== undefined) reflectionMergePartial(this, message, value)
        return message
    }
    internalBinaryRead(reader, length, options, target) {
        const message = target ?? this.create(),
            end = reader.pos + length
        while (reader.pos < end) {
            const [fieldNo, wireType] = reader.tag()
            switch (fieldNo) {
                case /* repeated com.digitalasset.canton.crypto.v30.SigningAlgorithmSpec algorithms */ 1:
                    if (wireType === WireType.LengthDelimited)
                        for (
                            let e = reader.int32() + reader.pos;
                            reader.pos < e;

                        )
                            message.algorithms.push(reader.int32())
                    else message.algorithms.push(reader.int32())
                    break
                case /* repeated com.digitalasset.canton.crypto.v30.SigningKeySpec keys */ 2:
                    if (wireType === WireType.LengthDelimited)
                        for (
                            let e = reader.int32() + reader.pos;
                            reader.pos < e;

                        )
                            message.keys.push(reader.int32())
                    else message.keys.push(reader.int32())
                    break
                default:
                    const u = options.readUnknownField
                    if (u === 'throw')
                        throw new globalThis.Error(
                            `Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`
                        )
                    const d = reader.skip(wireType)
                    if (u !== false)
                        (u === true ? UnknownFieldHandler.onRead : u)(
                            this.typeName,
                            message,
                            fieldNo,
                            wireType,
                            d
                        )
            }
        }
        return message
    }
    internalBinaryWrite(message, writer, options) {
        /* repeated com.digitalasset.canton.crypto.v30.SigningAlgorithmSpec algorithms = 1; */
        if (message.algorithms.length) {
            writer.tag(1, WireType.LengthDelimited).fork()
            for (let i = 0; i < message.algorithms.length; i++)
                writer.int32(message.algorithms[i])
            writer.join()
        }
        /* repeated com.digitalasset.canton.crypto.v30.SigningKeySpec keys = 2; */
        if (message.keys.length) {
            writer.tag(2, WireType.LengthDelimited).fork()
            for (let i = 0; i < message.keys.length; i++)
                writer.int32(message.keys[i])
            writer.join()
        }
        const u = options.writeUnknownFields
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(
                this.typeName,
                message,
                writer
            )
        return writer
    }
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.crypto.v30.RequiredSigningSpecs
 */
export const RequiredSigningSpecs = new RequiredSigningSpecs$Type()
// @generated message type with reflection information, may provide speed optimized methods
class EncryptionPublicKey$Type extends MessageType {
    constructor() {
        super('com.digitalasset.canton.crypto.v30.EncryptionPublicKey', [
            {
                no: 2,
                name: 'format',
                kind: 'enum',
                T: () => [
                    'com.digitalasset.canton.crypto.v30.CryptoKeyFormat',
                    CryptoKeyFormat,
                    'CRYPTO_KEY_FORMAT_',
                ],
            },
            {
                no: 3,
                name: 'public_key',
                kind: 'scalar',
                T: 12 /*ScalarType.BYTES*/,
            },
            {
                no: 4,
                name: 'scheme',
                kind: 'enum',
                T: () => [
                    'com.digitalasset.canton.crypto.v30.EncryptionKeyScheme',
                    EncryptionKeyScheme,
                    'ENCRYPTION_KEY_SCHEME_',
                ],
            },
            {
                no: 5,
                name: 'key_spec',
                kind: 'enum',
                T: () => [
                    'com.digitalasset.canton.crypto.v30.EncryptionKeySpec',
                    EncryptionKeySpec,
                    'ENCRYPTION_KEY_SPEC_',
                ],
            },
        ])
    }
    create(value) {
        const message = globalThis.Object.create(this.messagePrototype)
        message.format = 0
        message.publicKey = new Uint8Array(0)
        message.scheme = 0
        message.keySpec = 0
        if (value !== undefined) reflectionMergePartial(this, message, value)
        return message
    }
    internalBinaryRead(reader, length, options, target) {
        const message = target ?? this.create(),
            end = reader.pos + length
        while (reader.pos < end) {
            const [fieldNo, wireType] = reader.tag()
            switch (fieldNo) {
                case /* com.digitalasset.canton.crypto.v30.CryptoKeyFormat format */ 2:
                    message.format = reader.int32()
                    break
                case /* bytes public_key */ 3:
                    message.publicKey = reader.bytes()
                    break
                case /* com.digitalasset.canton.crypto.v30.EncryptionKeyScheme scheme = 4 [deprecated = true] */ 4:
                    message.scheme = reader.int32()
                    break
                case /* com.digitalasset.canton.crypto.v30.EncryptionKeySpec key_spec */ 5:
                    message.keySpec = reader.int32()
                    break
                default:
                    const u = options.readUnknownField
                    if (u === 'throw')
                        throw new globalThis.Error(
                            `Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`
                        )
                    const d = reader.skip(wireType)
                    if (u !== false)
                        (u === true ? UnknownFieldHandler.onRead : u)(
                            this.typeName,
                            message,
                            fieldNo,
                            wireType,
                            d
                        )
            }
        }
        return message
    }
    internalBinaryWrite(message, writer, options) {
        /* com.digitalasset.canton.crypto.v30.CryptoKeyFormat format = 2; */
        if (message.format !== 0)
            writer.tag(2, WireType.Varint).int32(message.format)
        /* bytes public_key = 3; */
        if (message.publicKey.length)
            writer.tag(3, WireType.LengthDelimited).bytes(message.publicKey)
        /* com.digitalasset.canton.crypto.v30.EncryptionKeyScheme scheme = 4 [deprecated = true]; */
        if (message.scheme !== 0)
            writer.tag(4, WireType.Varint).int32(message.scheme)
        /* com.digitalasset.canton.crypto.v30.EncryptionKeySpec key_spec = 5; */
        if (message.keySpec !== 0)
            writer.tag(5, WireType.Varint).int32(message.keySpec)
        const u = options.writeUnknownFields
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(
                this.typeName,
                message,
                writer
            )
        return writer
    }
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.crypto.v30.EncryptionPublicKey
 */
export const EncryptionPublicKey = new EncryptionPublicKey$Type()
// @generated message type with reflection information, may provide speed optimized methods
class EncryptionPrivateKey$Type extends MessageType {
    constructor() {
        super('com.digitalasset.canton.crypto.v30.EncryptionPrivateKey', [
            { no: 1, name: 'id', kind: 'scalar', T: 9 /*ScalarType.STRING*/ },
            {
                no: 2,
                name: 'format',
                kind: 'enum',
                T: () => [
                    'com.digitalasset.canton.crypto.v30.CryptoKeyFormat',
                    CryptoKeyFormat,
                    'CRYPTO_KEY_FORMAT_',
                ],
            },
            {
                no: 3,
                name: 'private_key',
                kind: 'scalar',
                T: 12 /*ScalarType.BYTES*/,
            },
            {
                no: 4,
                name: 'scheme',
                kind: 'enum',
                T: () => [
                    'com.digitalasset.canton.crypto.v30.EncryptionKeyScheme',
                    EncryptionKeyScheme,
                    'ENCRYPTION_KEY_SCHEME_',
                ],
            },
            {
                no: 5,
                name: 'key_spec',
                kind: 'enum',
                T: () => [
                    'com.digitalasset.canton.crypto.v30.EncryptionKeySpec',
                    EncryptionKeySpec,
                    'ENCRYPTION_KEY_SPEC_',
                ],
            },
        ])
    }
    create(value) {
        const message = globalThis.Object.create(this.messagePrototype)
        message.id = ''
        message.format = 0
        message.privateKey = new Uint8Array(0)
        message.scheme = 0
        message.keySpec = 0
        if (value !== undefined) reflectionMergePartial(this, message, value)
        return message
    }
    internalBinaryRead(reader, length, options, target) {
        const message = target ?? this.create(),
            end = reader.pos + length
        while (reader.pos < end) {
            const [fieldNo, wireType] = reader.tag()
            switch (fieldNo) {
                case /* string id */ 1:
                    message.id = reader.string()
                    break
                case /* com.digitalasset.canton.crypto.v30.CryptoKeyFormat format */ 2:
                    message.format = reader.int32()
                    break
                case /* bytes private_key */ 3:
                    message.privateKey = reader.bytes()
                    break
                case /* com.digitalasset.canton.crypto.v30.EncryptionKeyScheme scheme = 4 [deprecated = true] */ 4:
                    message.scheme = reader.int32()
                    break
                case /* com.digitalasset.canton.crypto.v30.EncryptionKeySpec key_spec */ 5:
                    message.keySpec = reader.int32()
                    break
                default:
                    const u = options.readUnknownField
                    if (u === 'throw')
                        throw new globalThis.Error(
                            `Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`
                        )
                    const d = reader.skip(wireType)
                    if (u !== false)
                        (u === true ? UnknownFieldHandler.onRead : u)(
                            this.typeName,
                            message,
                            fieldNo,
                            wireType,
                            d
                        )
            }
        }
        return message
    }
    internalBinaryWrite(message, writer, options) {
        /* string id = 1; */
        if (message.id !== '')
            writer.tag(1, WireType.LengthDelimited).string(message.id)
        /* com.digitalasset.canton.crypto.v30.CryptoKeyFormat format = 2; */
        if (message.format !== 0)
            writer.tag(2, WireType.Varint).int32(message.format)
        /* bytes private_key = 3; */
        if (message.privateKey.length)
            writer.tag(3, WireType.LengthDelimited).bytes(message.privateKey)
        /* com.digitalasset.canton.crypto.v30.EncryptionKeyScheme scheme = 4 [deprecated = true]; */
        if (message.scheme !== 0)
            writer.tag(4, WireType.Varint).int32(message.scheme)
        /* com.digitalasset.canton.crypto.v30.EncryptionKeySpec key_spec = 5; */
        if (message.keySpec !== 0)
            writer.tag(5, WireType.Varint).int32(message.keySpec)
        const u = options.writeUnknownFields
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(
                this.typeName,
                message,
                writer
            )
        return writer
    }
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.crypto.v30.EncryptionPrivateKey
 */
export const EncryptionPrivateKey = new EncryptionPrivateKey$Type()
// @generated message type with reflection information, may provide speed optimized methods
class EncryptionKeyPair$Type extends MessageType {
    constructor() {
        super('com.digitalasset.canton.crypto.v30.EncryptionKeyPair', [
            {
                no: 1,
                name: 'public_key',
                kind: 'message',
                T: () => EncryptionPublicKey,
            },
            {
                no: 2,
                name: 'private_key',
                kind: 'message',
                T: () => EncryptionPrivateKey,
            },
        ])
    }
    create(value) {
        const message = globalThis.Object.create(this.messagePrototype)
        if (value !== undefined) reflectionMergePartial(this, message, value)
        return message
    }
    internalBinaryRead(reader, length, options, target) {
        const message = target ?? this.create(),
            end = reader.pos + length
        while (reader.pos < end) {
            const [fieldNo, wireType] = reader.tag()
            switch (fieldNo) {
                case /* com.digitalasset.canton.crypto.v30.EncryptionPublicKey public_key */ 1:
                    message.publicKey = EncryptionPublicKey.internalBinaryRead(
                        reader,
                        reader.uint32(),
                        options,
                        message.publicKey
                    )
                    break
                case /* com.digitalasset.canton.crypto.v30.EncryptionPrivateKey private_key */ 2:
                    message.privateKey =
                        EncryptionPrivateKey.internalBinaryRead(
                            reader,
                            reader.uint32(),
                            options,
                            message.privateKey
                        )
                    break
                default:
                    const u = options.readUnknownField
                    if (u === 'throw')
                        throw new globalThis.Error(
                            `Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`
                        )
                    const d = reader.skip(wireType)
                    if (u !== false)
                        (u === true ? UnknownFieldHandler.onRead : u)(
                            this.typeName,
                            message,
                            fieldNo,
                            wireType,
                            d
                        )
            }
        }
        return message
    }
    internalBinaryWrite(message, writer, options) {
        /* com.digitalasset.canton.crypto.v30.EncryptionPublicKey public_key = 1; */
        if (message.publicKey)
            EncryptionPublicKey.internalBinaryWrite(
                message.publicKey,
                writer.tag(1, WireType.LengthDelimited).fork(),
                options
            ).join()
        /* com.digitalasset.canton.crypto.v30.EncryptionPrivateKey private_key = 2; */
        if (message.privateKey)
            EncryptionPrivateKey.internalBinaryWrite(
                message.privateKey,
                writer.tag(2, WireType.LengthDelimited).fork(),
                options
            ).join()
        const u = options.writeUnknownFields
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(
                this.typeName,
                message,
                writer
            )
        return writer
    }
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.crypto.v30.EncryptionKeyPair
 */
export const EncryptionKeyPair = new EncryptionKeyPair$Type()
// @generated message type with reflection information, may provide speed optimized methods
class RequiredEncryptionSpecs$Type extends MessageType {
    constructor() {
        super('com.digitalasset.canton.crypto.v30.RequiredEncryptionSpecs', [
            {
                no: 1,
                name: 'algorithms',
                kind: 'enum',
                repeat: 1 /*RepeatType.PACKED*/,
                T: () => [
                    'com.digitalasset.canton.crypto.v30.EncryptionAlgorithmSpec',
                    EncryptionAlgorithmSpec,
                    'ENCRYPTION_ALGORITHM_SPEC_',
                ],
            },
            {
                no: 2,
                name: 'keys',
                kind: 'enum',
                repeat: 1 /*RepeatType.PACKED*/,
                T: () => [
                    'com.digitalasset.canton.crypto.v30.EncryptionKeySpec',
                    EncryptionKeySpec,
                    'ENCRYPTION_KEY_SPEC_',
                ],
            },
        ])
    }
    create(value) {
        const message = globalThis.Object.create(this.messagePrototype)
        message.algorithms = []
        message.keys = []
        if (value !== undefined) reflectionMergePartial(this, message, value)
        return message
    }
    internalBinaryRead(reader, length, options, target) {
        const message = target ?? this.create(),
            end = reader.pos + length
        while (reader.pos < end) {
            const [fieldNo, wireType] = reader.tag()
            switch (fieldNo) {
                case /* repeated com.digitalasset.canton.crypto.v30.EncryptionAlgorithmSpec algorithms */ 1:
                    if (wireType === WireType.LengthDelimited)
                        for (
                            let e = reader.int32() + reader.pos;
                            reader.pos < e;

                        )
                            message.algorithms.push(reader.int32())
                    else message.algorithms.push(reader.int32())
                    break
                case /* repeated com.digitalasset.canton.crypto.v30.EncryptionKeySpec keys */ 2:
                    if (wireType === WireType.LengthDelimited)
                        for (
                            let e = reader.int32() + reader.pos;
                            reader.pos < e;

                        )
                            message.keys.push(reader.int32())
                    else message.keys.push(reader.int32())
                    break
                default:
                    const u = options.readUnknownField
                    if (u === 'throw')
                        throw new globalThis.Error(
                            `Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`
                        )
                    const d = reader.skip(wireType)
                    if (u !== false)
                        (u === true ? UnknownFieldHandler.onRead : u)(
                            this.typeName,
                            message,
                            fieldNo,
                            wireType,
                            d
                        )
            }
        }
        return message
    }
    internalBinaryWrite(message, writer, options) {
        /* repeated com.digitalasset.canton.crypto.v30.EncryptionAlgorithmSpec algorithms = 1; */
        if (message.algorithms.length) {
            writer.tag(1, WireType.LengthDelimited).fork()
            for (let i = 0; i < message.algorithms.length; i++)
                writer.int32(message.algorithms[i])
            writer.join()
        }
        /* repeated com.digitalasset.canton.crypto.v30.EncryptionKeySpec keys = 2; */
        if (message.keys.length) {
            writer.tag(2, WireType.LengthDelimited).fork()
            for (let i = 0; i < message.keys.length; i++)
                writer.int32(message.keys[i])
            writer.join()
        }
        const u = options.writeUnknownFields
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(
                this.typeName,
                message,
                writer
            )
        return writer
    }
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.crypto.v30.RequiredEncryptionSpecs
 */
export const RequiredEncryptionSpecs = new RequiredEncryptionSpecs$Type()
// @generated message type with reflection information, may provide speed optimized methods
class CryptoKeyPair$Type extends MessageType {
    constructor() {
        super('com.digitalasset.canton.crypto.v30.CryptoKeyPair', [
            {
                no: 1,
                name: 'signing_key_pair',
                kind: 'message',
                oneof: 'pair',
                T: () => SigningKeyPair,
            },
            {
                no: 2,
                name: 'encryption_key_pair',
                kind: 'message',
                oneof: 'pair',
                T: () => EncryptionKeyPair,
            },
        ])
    }
    create(value) {
        const message = globalThis.Object.create(this.messagePrototype)
        message.pair = { oneofKind: undefined }
        if (value !== undefined) reflectionMergePartial(this, message, value)
        return message
    }
    internalBinaryRead(reader, length, options, target) {
        const message = target ?? this.create(),
            end = reader.pos + length
        while (reader.pos < end) {
            const [fieldNo, wireType] = reader.tag()
            switch (fieldNo) {
                case /* com.digitalasset.canton.crypto.v30.SigningKeyPair signing_key_pair */ 1:
                    message.pair = {
                        oneofKind: 'signingKeyPair',
                        signingKeyPair: SigningKeyPair.internalBinaryRead(
                            reader,
                            reader.uint32(),
                            options,
                            message.pair.signingKeyPair
                        ),
                    }
                    break
                case /* com.digitalasset.canton.crypto.v30.EncryptionKeyPair encryption_key_pair */ 2:
                    message.pair = {
                        oneofKind: 'encryptionKeyPair',
                        encryptionKeyPair: EncryptionKeyPair.internalBinaryRead(
                            reader,
                            reader.uint32(),
                            options,
                            message.pair.encryptionKeyPair
                        ),
                    }
                    break
                default:
                    const u = options.readUnknownField
                    if (u === 'throw')
                        throw new globalThis.Error(
                            `Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`
                        )
                    const d = reader.skip(wireType)
                    if (u !== false)
                        (u === true ? UnknownFieldHandler.onRead : u)(
                            this.typeName,
                            message,
                            fieldNo,
                            wireType,
                            d
                        )
            }
        }
        return message
    }
    internalBinaryWrite(message, writer, options) {
        /* com.digitalasset.canton.crypto.v30.SigningKeyPair signing_key_pair = 1; */
        if (message.pair.oneofKind === 'signingKeyPair')
            SigningKeyPair.internalBinaryWrite(
                message.pair.signingKeyPair,
                writer.tag(1, WireType.LengthDelimited).fork(),
                options
            ).join()
        /* com.digitalasset.canton.crypto.v30.EncryptionKeyPair encryption_key_pair = 2; */
        if (message.pair.oneofKind === 'encryptionKeyPair')
            EncryptionKeyPair.internalBinaryWrite(
                message.pair.encryptionKeyPair,
                writer.tag(2, WireType.LengthDelimited).fork(),
                options
            ).join()
        const u = options.writeUnknownFields
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(
                this.typeName,
                message,
                writer
            )
        return writer
    }
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.crypto.v30.CryptoKeyPair
 */
export const CryptoKeyPair = new CryptoKeyPair$Type()
// @generated message type with reflection information, may provide speed optimized methods
class SymmetricKey$Type extends MessageType {
    constructor() {
        super(
            'com.digitalasset.canton.crypto.v30.SymmetricKey',
            [
                {
                    no: 1,
                    name: 'format',
                    kind: 'enum',
                    T: () => [
                        'com.digitalasset.canton.crypto.v30.CryptoKeyFormat',
                        CryptoKeyFormat,
                        'CRYPTO_KEY_FORMAT_',
                    ],
                },
                {
                    no: 2,
                    name: 'key',
                    kind: 'scalar',
                    T: 12 /*ScalarType.BYTES*/,
                },
                {
                    no: 3,
                    name: 'scheme',
                    kind: 'enum',
                    T: () => [
                        'com.digitalasset.canton.crypto.v30.SymmetricKeyScheme',
                        SymmetricKeyScheme,
                        'SYMMETRIC_KEY_SCHEME_',
                    ],
                },
            ],
            {
                'scalapb.message': {
                    companionExtends: [
                        'com.digitalasset.canton.version.AlphaProtoVersion',
                    ],
                },
            }
        )
    }
    create(value) {
        const message = globalThis.Object.create(this.messagePrototype)
        message.format = 0
        message.key = new Uint8Array(0)
        message.scheme = 0
        if (value !== undefined) reflectionMergePartial(this, message, value)
        return message
    }
    internalBinaryRead(reader, length, options, target) {
        const message = target ?? this.create(),
            end = reader.pos + length
        while (reader.pos < end) {
            const [fieldNo, wireType] = reader.tag()
            switch (fieldNo) {
                case /* com.digitalasset.canton.crypto.v30.CryptoKeyFormat format */ 1:
                    message.format = reader.int32()
                    break
                case /* bytes key */ 2:
                    message.key = reader.bytes()
                    break
                case /* com.digitalasset.canton.crypto.v30.SymmetricKeyScheme scheme */ 3:
                    message.scheme = reader.int32()
                    break
                default:
                    const u = options.readUnknownField
                    if (u === 'throw')
                        throw new globalThis.Error(
                            `Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`
                        )
                    const d = reader.skip(wireType)
                    if (u !== false)
                        (u === true ? UnknownFieldHandler.onRead : u)(
                            this.typeName,
                            message,
                            fieldNo,
                            wireType,
                            d
                        )
            }
        }
        return message
    }
    internalBinaryWrite(message, writer, options) {
        /* com.digitalasset.canton.crypto.v30.CryptoKeyFormat format = 1; */
        if (message.format !== 0)
            writer.tag(1, WireType.Varint).int32(message.format)
        /* bytes key = 2; */
        if (message.key.length)
            writer.tag(2, WireType.LengthDelimited).bytes(message.key)
        /* com.digitalasset.canton.crypto.v30.SymmetricKeyScheme scheme = 3; */
        if (message.scheme !== 0)
            writer.tag(3, WireType.Varint).int32(message.scheme)
        const u = options.writeUnknownFields
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(
                this.typeName,
                message,
                writer
            )
        return writer
    }
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.crypto.v30.SymmetricKey
 */
export const SymmetricKey = new SymmetricKey$Type()
// @generated message type with reflection information, may provide speed optimized methods
class PasswordBasedEncrypted$Type extends MessageType {
    constructor() {
        super('com.digitalasset.canton.crypto.v30.PasswordBasedEncrypted', [
            {
                no: 1,
                name: 'ciphertext',
                kind: 'scalar',
                T: 12 /*ScalarType.BYTES*/,
            },
            {
                no: 2,
                name: 'symmetric_key_scheme',
                kind: 'enum',
                T: () => [
                    'com.digitalasset.canton.crypto.v30.SymmetricKeyScheme',
                    SymmetricKeyScheme,
                    'SYMMETRIC_KEY_SCHEME_',
                ],
            },
            {
                no: 3,
                name: 'pbkdf_scheme',
                kind: 'enum',
                T: () => [
                    'com.digitalasset.canton.crypto.v30.PbkdfScheme',
                    PbkdfScheme,
                    'PBKDF_SCHEME_',
                ],
            },
            { no: 4, name: 'salt', kind: 'scalar', T: 12 /*ScalarType.BYTES*/ },
        ])
    }
    create(value) {
        const message = globalThis.Object.create(this.messagePrototype)
        message.ciphertext = new Uint8Array(0)
        message.symmetricKeyScheme = 0
        message.pbkdfScheme = 0
        message.salt = new Uint8Array(0)
        if (value !== undefined) reflectionMergePartial(this, message, value)
        return message
    }
    internalBinaryRead(reader, length, options, target) {
        const message = target ?? this.create(),
            end = reader.pos + length
        while (reader.pos < end) {
            const [fieldNo, wireType] = reader.tag()
            switch (fieldNo) {
                case /* bytes ciphertext */ 1:
                    message.ciphertext = reader.bytes()
                    break
                case /* com.digitalasset.canton.crypto.v30.SymmetricKeyScheme symmetric_key_scheme */ 2:
                    message.symmetricKeyScheme = reader.int32()
                    break
                case /* com.digitalasset.canton.crypto.v30.PbkdfScheme pbkdf_scheme */ 3:
                    message.pbkdfScheme = reader.int32()
                    break
                case /* bytes salt */ 4:
                    message.salt = reader.bytes()
                    break
                default:
                    const u = options.readUnknownField
                    if (u === 'throw')
                        throw new globalThis.Error(
                            `Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`
                        )
                    const d = reader.skip(wireType)
                    if (u !== false)
                        (u === true ? UnknownFieldHandler.onRead : u)(
                            this.typeName,
                            message,
                            fieldNo,
                            wireType,
                            d
                        )
            }
        }
        return message
    }
    internalBinaryWrite(message, writer, options) {
        /* bytes ciphertext = 1; */
        if (message.ciphertext.length)
            writer.tag(1, WireType.LengthDelimited).bytes(message.ciphertext)
        /* com.digitalasset.canton.crypto.v30.SymmetricKeyScheme symmetric_key_scheme = 2; */
        if (message.symmetricKeyScheme !== 0)
            writer.tag(2, WireType.Varint).int32(message.symmetricKeyScheme)
        /* com.digitalasset.canton.crypto.v30.PbkdfScheme pbkdf_scheme = 3; */
        if (message.pbkdfScheme !== 0)
            writer.tag(3, WireType.Varint).int32(message.pbkdfScheme)
        /* bytes salt = 4; */
        if (message.salt.length)
            writer.tag(4, WireType.LengthDelimited).bytes(message.salt)
        const u = options.writeUnknownFields
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(
                this.typeName,
                message,
                writer
            )
        return writer
    }
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.crypto.v30.PasswordBasedEncrypted
 */
export const PasswordBasedEncrypted = new PasswordBasedEncrypted$Type()
// @generated message type with reflection information, may provide speed optimized methods
class AsymmetricEncrypted$Type extends MessageType {
    constructor() {
        super('com.digitalasset.canton.crypto.v30.AsymmetricEncrypted', [
            {
                no: 1,
                name: 'ciphertext',
                kind: 'scalar',
                T: 12 /*ScalarType.BYTES*/,
            },
            {
                no: 2,
                name: 'encryption_algorithm_spec',
                kind: 'enum',
                T: () => [
                    'com.digitalasset.canton.crypto.v30.EncryptionAlgorithmSpec',
                    EncryptionAlgorithmSpec,
                    'ENCRYPTION_ALGORITHM_SPEC_',
                ],
            },
            {
                no: 3,
                name: 'fingerprint',
                kind: 'scalar',
                T: 9 /*ScalarType.STRING*/,
            },
        ])
    }
    create(value) {
        const message = globalThis.Object.create(this.messagePrototype)
        message.ciphertext = new Uint8Array(0)
        message.encryptionAlgorithmSpec = 0
        message.fingerprint = ''
        if (value !== undefined) reflectionMergePartial(this, message, value)
        return message
    }
    internalBinaryRead(reader, length, options, target) {
        const message = target ?? this.create(),
            end = reader.pos + length
        while (reader.pos < end) {
            const [fieldNo, wireType] = reader.tag()
            switch (fieldNo) {
                case /* bytes ciphertext */ 1:
                    message.ciphertext = reader.bytes()
                    break
                case /* com.digitalasset.canton.crypto.v30.EncryptionAlgorithmSpec encryption_algorithm_spec */ 2:
                    message.encryptionAlgorithmSpec = reader.int32()
                    break
                case /* string fingerprint */ 3:
                    message.fingerprint = reader.string()
                    break
                default:
                    const u = options.readUnknownField
                    if (u === 'throw')
                        throw new globalThis.Error(
                            `Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`
                        )
                    const d = reader.skip(wireType)
                    if (u !== false)
                        (u === true ? UnknownFieldHandler.onRead : u)(
                            this.typeName,
                            message,
                            fieldNo,
                            wireType,
                            d
                        )
            }
        }
        return message
    }
    internalBinaryWrite(message, writer, options) {
        /* bytes ciphertext = 1; */
        if (message.ciphertext.length)
            writer.tag(1, WireType.LengthDelimited).bytes(message.ciphertext)
        /* com.digitalasset.canton.crypto.v30.EncryptionAlgorithmSpec encryption_algorithm_spec = 2; */
        if (message.encryptionAlgorithmSpec !== 0)
            writer
                .tag(2, WireType.Varint)
                .int32(message.encryptionAlgorithmSpec)
        /* string fingerprint = 3; */
        if (message.fingerprint !== '')
            writer.tag(3, WireType.LengthDelimited).string(message.fingerprint)
        const u = options.writeUnknownFields
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(
                this.typeName,
                message,
                writer
            )
        return writer
    }
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.crypto.v30.AsymmetricEncrypted
 */
export const AsymmetricEncrypted = new AsymmetricEncrypted$Type()
