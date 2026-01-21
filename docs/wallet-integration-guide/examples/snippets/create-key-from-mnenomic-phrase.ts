import * as bip39 from 'bip39'
import { ed25519 } from '@noble/curves/ed25519.js'
import * as fs from 'fs'

async function createCantonKeyFromMnemonic(): Promise<void> {
    try {
        // 1. Generate a new 24-word BIP-0039 mnemonic
        const mnemonic: string = bip39.generateMnemonic(256)
        console.log('Generated Mnemonic:', mnemonic)

        // 2. Convert mnemonic to a seed
        const seed: Buffer = await bip39.mnemonicToSeed(mnemonic)

        // 3. Derive a 32-byte Private Key (first 32 bytes of the seed)
        const privateKey: Uint8Array = new Uint8Array(seed.slice(0, 32))
        const publicKey: Uint8Array = ed25519.getPublicKey(privateKey)

        const privHex: string = Buffer.from(privateKey).toString('hex')
        const pubHex: string = Buffer.from(publicKey).toString('hex')

        console.log('Private Key (Hex):', privHex)
        console.log('Public Key (Hex):', pubHex)

        // 4. Save to a file for Canton Import
        fs.writeFileSync('canton_private_key.hex', privHex)

        console.log("\nSuccess: Private key saved to 'canton_private_key.hex'")
        console.log('Keep your mnemonic phrase safe!')
    } catch (error) {
        console.error('An error occurred:', error)
    }
}

createCantonKeyFromMnemonic()
