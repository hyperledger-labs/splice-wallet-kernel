# Clean Coding Guidelines

In here is contained the clean coding guidelines for the Wallet Gateway repo.
These guidelines are meant to help maintain a high standard of code quality and readability across the codebase.
These guidelines are decided within the Wallet team, and are subject to change as the repo evolves.

## General Principles

### Folder Structure

- Use a clear and consistent folder structure that reflects the functionality of the code.
- For workspaces keep the folder hierarchy as flat as possible, with each package in its own folder.
- The name used in the `package.json` should match the folder name and structure. _(this is enforced with [script](../scripts/src/clean-coding.ts))_
    - it may be prefixed with `splice-wallet` or `splice-wallet-kernel` in cases where it would be to generic or ambiguous.
- All `package.json` should aim to use ES Modules (`"type": "module"`)
- All `package.json` should be written in typescript and inherit one of (`tsconfig.web.json` , `tsconfig.node.json` , or `tsconfig.base.json`)
- All `package.json` must include the `"main"` and `"types"` fields, which points to files.

### API Specification with OpenRPC

For all interfaces and APIs that have the potential to be consumed by external systems or may be run as a separate service, we use **OpenRPC** as the specification standard.
This approach ensures that our APIs are well-documented, consistent, and interoperable.

The workflow is as follows:

- **Define the OpenRPC specification first:** Before implementing an API, we write its OpenRPC specification to clearly describe its methods, parameters, and expected results.
- **Generate client and server stubs:** Using the [`open-rpc/generator`](https://github.com/open-rpc/generator) package, we generate both client and server code stubs directly from the specification. This reduces manual coding, avoids inconsistencies, and accelerates development.

By following this process, we ensure that our APIs are robust, maintainable, and ready for integration with other systems or services.

### Schemas and Type Inference with Zod

We use the [`zod`](https://github.com/colinhacks/zod) library to define schemas for all data structures that require serialization or deserialization—such as configuration files or any data exchanged over the wire.
These schemas serve a dual purpose: they provide runtime validation and are also used for TypeScript type inference, allowing us to automatically generate the corresponding TypeScript types.

**Guideline:**

- **Do not manually define interfaces** for data that needs to be (de)serialized. Instead, define a Zod schema and use `z.infer<typeof Schema>` to generate the TypeScript type.
- **Manual interfaces** are only created for purely internal structures that do not require serialization or validation.

This approach ensures that our types and validation logic always stay in sync, reducing duplication and the risk of mismatches between runtime and compile-time representations.
