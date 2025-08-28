# Wallet UI Components

This workspace contains UI components for the Wallet Kernel, implemented with [Web Components](https://www.webcomponents.org/introduction).

## Overview

This package provides a modular set of UI building blocks and utilities for wallet-related web applications.

[components](./src/components/): Contains reusable web components (such as headers, layouts, and forms) that can be used across different wallet UIs. These components are designed for flexibility and composability.

[windows](./src/windows/): Provides predefined window-based functionalities, such as wallet discovery dialogs. These are typically used by higher-level packages like the SDK to implement user flows that require popups or modal interactions.

[themes](./src/themes/): Includes the default theme (CSS custom properties and styles) to ensure a consistent look and feel across all components and windows. This theme can be extended or overridden as needed.

Together, this package enables rapid development of wallet UIs with a consistent user experience and shared logic.

## Installation

This package requires [NodeJS](https://nodejs.org/) v16 or higher and can be added to your project using:

```sh
npm install @canton-network/core-wallet-ui-components --save
```

or

```sh
yarn add @canton-network/core-wallet-ui-components
```

## Run

To build the package, run:

```sh
yarn build
```

To start a local web development server for interactive testing and development, run:

```sh
yarn dev
```

## Usage

The main entry point for building wallet UIs is the `AppLayout` component.
The `AppLayout` provides a consistent page structure (e.g. encapsulates the `AppHeader`), and automatically includes the [Bootstrap](https://getbootstrap.com/) CSS framework along with a [default theme](./themes/default.css) for a unified look and feel.

Basic usage:

```html
  <body>
      <app-layout>
          <you-component></your-component>
      </app-layout>
  </body>
```

You can also customize the layout by specifying a custom icon or stylesheet:

```html
  <app-layout iconSrc="images/icon.png" themeSrc="css/custom.css">
      <you-component></your-component>
  </app-layout>
```

- `iconSrc`: Path to a custom icon displayed in the header.
- `themeSrc`: Path to an alternative CSS file for custom theming.

This approach allows you to rapidly compose wallet UIs with a consistent structure and appearance, while still supporting customization as needed.
