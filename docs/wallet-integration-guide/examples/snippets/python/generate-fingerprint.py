# Function to compute a canton fingerprint 
def compute_fingerprint(public_key_bytes: bytes) -> str:
    """
    Computes the fingerprint of a public signing key.

    Args:
        public_key_bytes (bytes): The serialized transaction data.

    Returns:
        str: The computed fingerprint in hexadecimal format.
    """
    return compute_sha256_canton_hash(12, public_key_bytes).hex()

# Computing the party fingerprint from the public key
public_key_bytes: bytes = public_key.public_bytes(
    encoding=serialization.Encoding.DER,
    format=serialization.PublicFormat.SubjectPublicKeyInfo,
)
public_key_fingerprint = compute_fingerprint(public_key_bytes)