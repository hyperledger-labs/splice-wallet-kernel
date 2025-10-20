# Splice Browser Extension Wallet

The browser extension Wallet Client for Chrome and Firefox. To aim for better cross-browser compatibility, use the [WebExtension browser polyfill](https://github.com/mozilla/webextension-polyfill?tab=readme-ov-file). Be aware that some differences between Chrome/Firefox may not be covered.

# Building

The extension's source code is written in TypeScript and built with `esbuild`, in order to fully bundle the project dependencies (like Lit) into the output JS.

Run `yarn build` to run the build once, or `yarn dev` to keep esbuild watching for changes. (Note that this runs automatically with `yarn start:all` from the root script).

# Developing

## Chrome

- See the tutorial on [loading an unpacked extension](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked) for Google Chrome
- See the tutorial on [debugging techniques](https://developer.chrome.com/docs/extensions/get-started/tutorial/debug) in Google Chrome

## Firefox

Run `yarn start` to start an isolated FF instance with the extension loaded. To aid development, follow the debugging workflow:

1. Navigate to `about:debugging`
2. Click on "This Firefox"
3. Click on the "Inspect" button under the Splice Wallet Gateway
4. (Optional) open the three dot menu on the right, and click "Disable Popup Auto-Hide" to prevent the extension window from closing automatically when switching between the Dev Tools window and the main browser window
