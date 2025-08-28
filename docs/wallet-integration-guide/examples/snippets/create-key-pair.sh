 # Generate an ECDSA private key and extract its public key
 openssl ecparam -name prime256v1 -genkey -noout -outform DER -out namespace_private_key.der
 openssl ec -inform der -in namespace_private_key.der -pubout -outform der -out namespace_public_key.der 2> /dev/null