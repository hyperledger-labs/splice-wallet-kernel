.. _getting-started:

Getting Started
===============

This guide will help you get the Wallet Gateway up and running quickly.

Installation
------------

Install the Wallet Gateway globally using npm:

.. code-block:: bash

    npm install -g @canton-network/wallet-gateway-remote

Alternatively, you can run it directly through npx (tested with Node.js v24):

.. code-block:: bash

    npx @canton-network/wallet-gateway-remote -c ./config.json

Quick Start
-----------

1. **Create a Configuration File**

   First, generate an example configuration file:

   .. code-block:: bash

       wallet-gateway --config-example > config.json

   Or, if using npx:

   .. code-block:: bash

       npx @canton-network/wallet-gateway-remote --config-example > config.json

2. **Edit the Configuration**

   Open ``config.json`` and customize it for your environment. At minimum, you'll need to configure:

   - **Store connection**: Database configuration (in-memory, SQLite, or PostgreSQL)
   - **Networks**: At least one Canton network with its Ledger API endpoint
   - **Identity Providers**: Authentication configuration for your networks

   See :ref:`configuring-wallet-gateway` for detailed configuration options.

3. **Start the Gateway**

   .. code-block:: bash

       wallet-gateway -c ./config.json

   Or with a custom port:

   .. code-block:: bash

       wallet-gateway -c ./config.json -p 8080

4. **Verify it's Running**

   Once started, the Wallet Gateway exposes three endpoints:

   - **Web UI**: ``http://localhost:3030`` (or your configured port)
   - **dApp JSON-RPC API**: ``http://localhost:3030/api/v0/dapp``
   - **User JSON-RPC API**: ``http://localhost:3030/api/v0/user``

   Open the web UI in your browser to confirm it's running.

Command Line Options
--------------------

The Wallet Gateway supports the following command-line options:

.. code-block:: text

    -c, --config <path>          Set config path (default: ./config.json)
    --config-schema              Output the config schema (JSON Schema) and exit
    --config-example             Output an example config and exit
    -p, --port [port]            Set port (overrides config file)
    -f, --log-format <format>    Set log format: json or pretty (default: pretty)

Example:

.. code-block:: bash

    # Generate config schema
    wallet-gateway --config-schema

    # Run with JSON logging
    wallet-gateway -c ./config.json -f json

Configuration Schema
--------------------

To see the full JSON Schema for the configuration file, run:

.. code-block:: bash

    wallet-gateway --config-schema

This outputs a complete JSON Schema that can be used for validation and IDE autocomplete support.

Next Steps
----------

- Read :ref:`configuring-wallet-gateway` to understand all configuration options
- Explore the :ref:`apis` to understand how to interact with the Gateway
- Learn about :ref:`signing-providers` to configure transaction signing
- Check :ref:`troubleshooting` if you encounter any issues
