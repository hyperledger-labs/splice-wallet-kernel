import { getPublicKeyFromPrivate } from '@canton-network/core-signing-lib'
import naclUtil from 'tweetnacl-util'
import * as bip39 from 'bip39'
import * as fs from 'fs'

export default async function createCantonKeyFromMnemonic() {
    try {
        // 1. Generate a new 24-word BIP-0039 mnemonic
        const mnemonic = bip39.generateMnemonic(256)
        console.log('Generated Mnemonic:', mnemonic)

        // 2. Convert mnemonic to a seed
        const seed = await bip39.mnemonicToSeed(mnemonic)

        // 3. Derive a 32-byte Private Key (first 32 bytes of the seed)
        const privateKey = naclUtil.encodeBase64(seed.slice(0, 32))
        const publicKey = getPublicKeyFromPrivate(privateKey)

        console.log('Private Key (bas64):', privateKey)
        console.log('Public Key (bas64):', publicKey)

        // 4. Save to a file for Canton Import
        fs.writeFileSync('canton_private_key.base64', privateKey)

        console.log(
            "\nSuccess: Private key saved to 'canton_private_key.base64'"
        )
        console.log('Keep your mnemonic phrase safe!')
    } catch (error) {
        console.error('An error occurred:', error)
    }
}

createCantonKeyFromMnemonic()
