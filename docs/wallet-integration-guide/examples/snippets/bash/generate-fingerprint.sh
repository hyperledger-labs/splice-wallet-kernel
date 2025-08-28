# Function to compute a canton compatible sha-256 hash
 compute_canton_hash() {
   # The hash purpose integer must be prefixed to the content to be hashed as a 4 bytes big endian
   (printf "\\x00\\x00\\x00\\x$(printf '%02X' "$1")"; cat - <(cat)) | \
   # Then hash with sha256
   openssl dgst -sha256 -binary | \
   # And finally prefix with 0x12 (The multicodec code for SHA256 https://github.com/multiformats/multicodec/blob/master/table.csv#L9)
   # and 0x20, the length of the hash (32 bytes)
   ( printf '\x12\x20'; cat - )
 }

# Compute fingerprint function
 compute_canton_fingerprint() {
   # 12 is the hash purpose for public key fingerprints
   # https://github.com/digital-asset/canton/blob/main/community/base/src/main/scala/com/digitalasset/canton/crypto/HashPurpose.scala
   compute_canton_hash 12 | encode_to_hex
 }

# Compute the fingerprint of the public key
 fingerprint=$(compute_canton_fingerprint < namespace_public_key.der)