# Fireblocks Signing Driver

A driver for signing and retrieving transactions using the Fireblocks API implementing the `SigningDriverInterface` from `@canton-network/core-signing-lib`.

# Testing

To test the Fireblocks signing driver with mocks, you can use the normal `yarn workspace @canton-network/core-signing-fireblocks test` command from the root directory.

To test with an actual Fireblocks account:

1. Generate a Fireblocks signing key: `openssl req -new -newkey rsa:4096 -nodes -keyout fireblocks_secret.key -out fireblocks.csr -subj '/O=Digital Asset - Canton'`
2. Put the `fireblocks_secret.key` file in this directory
3. Sign in to https://www.fireblocks.com/ or ask for invite if you don't have an account.
4. Create an API User in Fireblocks and upload the `fireblocks.csr` file. Save the API Key it gives you (it will be a UUIDv4 string). You will find it in `API User (ID)` column in fireblocks api users table
5. You will need approval of your accounts/keys.
6. From the root directory, run the tests with: `FIREBLOCKS_API_KEY=<your_api_key> yarn workspace @canton-network/core-signing-fireblocks test`
