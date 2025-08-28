 private_key = ec.generate_private_key(curve=ec.SECP256R1())
 public_key = private_key.public_key()

 # Extract the public key in the DER format
 public_key_bytes: bytes = public_key.public_bytes(
     encoding=serialization.Encoding.DER,
     format=serialization.PublicFormat.SubjectPublicKeyInfo,
 )
 # Wrap the public key in a Canton protobuf message
 signing_public_key = crypto_pb2.SigningPublicKey(
     # Must match the format to which the key was exported to above
     format=crypto_pb2.CryptoKeyFormat.CRYPTO_KEY_FORMAT_DER,
     public_key=public_key_bytes,
     # Must match the scheme of the key
     scheme=crypto_pb2.SigningKeyScheme.SIGNING_KEY_SCHEME_EC_DSA_P256,
     # Because we have only one key, we specify both NAMESPACE and PROTOCOL usage for it
     # When using different keys, ensure to use only the correct usage for each
     usage=[
         crypto_pb2.SigningKeyUsage.SIGNING_KEY_USAGE_NAMESPACE,
         crypto_pb2.SigningKeyUsage.SIGNING_KEY_USAGE_PROTOCOL,
     ],
     # This field is deprecated in favor of scheme but python requires us to set it
     key_spec=crypto_pb2.SIGNING_KEY_SPEC_EC_P256,
 )