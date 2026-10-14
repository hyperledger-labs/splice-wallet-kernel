# Wallet Integration Guide

The guide is written in Markdown under `src/`. Code samples are not copied into the pages. A sample is a link to a tested file in `examples/`, followed by an include comment on the same line. The [two-way sync](../README.md) with the central docs repository (`canton-network/cf-docs`) replaces it with a code block there:

```md
[`scripts/01-init.ts`](../../examples/scripts/01-init.ts) <!-- include -->
[Full example](../../examples/scripts/05-preapproval.ts) <!-- include title="Full example" expandable -->
```

CI checks that every linked example exists:

```bash
pnpm docs:check-includes
```

`src/release-notes/index.rst` stays reStructuredText: the central docs repository reads it to generate the Wallet SDK release notes.
