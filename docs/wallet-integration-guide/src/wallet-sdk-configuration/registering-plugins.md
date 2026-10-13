---
title: 'Registering Plugins'
description: 'Extend the Wallet SDK with custom methods using the plugin system.'
---

The Wallet SDK supports extending its functionality through a plugin system. Plugins allow you to add custom methods and functionality to the SDK instance while maintaining access to the SDK context and logger.

### Creating and Registering a Plugin

To create a plugin, extend the `SDKPlugin` class and implement your custom functionality. Plugins are registered using the `registerPlugins` method, which accepts a record of plugin constructors keyed by their desired property names.

[`snippets/plugin.ts`](../../examples/snippets/plugin.ts) <!-- include -->

### Key Points

- **Plugin Constructor**: Plugin classes must accept `SDKContext` as a constructor parameter and pass it to the `super()` call along with the plugin name.
- **Type Safety**: The `registerPlugins` method provides full type safety, ensuring that registered plugins are accessible with proper autocompletion and type checking.
- **Access to SDK Context**: Plugins have access to the SDK's context, logger, and other internal utilities through the `ctx` property.
- **Multiple Plugins**: You can register multiple plugins at once by passing them in a single object to `registerPlugins`.
