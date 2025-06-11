# Glossary

This document aims to provide a coherent list of terms and their definition within this project. In some cases multiple terms have been used to refer to the same item, this document will not define common terms (like what an Interface is) or terms associated within other project under Splice, Daml or Canton (like Validator Node).

### Structure

the terms will have the following structure:

- **Term A** / Term B / ~~Term C~~: < Definition of the term >
    - SubTerm: < Definition of the subterm >

Rules:

- The **bold** appearance (Term A in above example) is the preferred term, but other terms could have been used throughout the document to refer to the same definition.
- In some cases narrowing term (SubTerm in the above example) is used to refer to a narrowing or specification within that term.
- A strikethrough (~~Term C~~ in the above example) would mean the term, have previously been used but should be avoided going forward.

Example:

- Vehicle / ~~Car~~: A mode of transportation used to move people or goods from one place to another.
    - Bicycle: A human-powered vehicle with two wheels.
    - Motorcycle / Scooter: A motor-powered vehicle with two wheels.

## Terms

- **Keystore** / Wallet Provider / Wallet: A service or application that securely stores and manages cryptographic keys, allowing users to sign transactions.
    - **CCSP**: A Crypto Custody Service Provider: A business that offers secure storage and management of digital assets.
- **dApp** / Decentralized Application: An application that runs on a decentralized network, often smart contracts to facilitate transactions and interactions.
- **Wallet Kernel** / Wallet Connector: The software component of this repo that acts as a mediator between a dApp, Validator Node, and Keystore.
- **Keystore Driver**: An implementation that integrates the Wallet Kernel with a specific KeyStore.
