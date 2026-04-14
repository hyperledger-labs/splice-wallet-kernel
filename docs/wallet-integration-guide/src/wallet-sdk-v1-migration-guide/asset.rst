.. Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
.. SPDX-License-Identifier: Apache-2.0

.. _asset-migration-v1:

Asset
=====

The asset namespace provides methods to discover and find token assets from registries on the Canton Network. In v1, the asset namespace introduces a dedicated API for asset discovery and management.

Key changes from v0 to v1
-------------------------

v0 required accessing asset information through the token standard service or by manually querying registries.

v1 introduces a dedicated asset namespace with a clean API for asset discovery. This enables:

- Simplified asset discovery from multiple registries
- Type-safe asset information retrieval
- Centralized asset registry management
- Built-in error handling for asset not found scenarios

Initializing the asset namespace
--------------------------------

The asset namespace is initialized separately from the main SDK, similar to other feature namespaces. You provide authentication and registry URLs.

.. code-block:: javascript

    const asset = await sdk.asset({
        auth: authConfig,
        registries: [registryUrl]
    })

Configuration
-------------

The ``AssetConfig`` type defines the configuration for the asset namespace:

.. code-block:: typescript

   type AssetConfig = {
       auth: TokenProviderConfig
       registries: URL[]
   }

- ``auth``: Authentication configuration for accessing registries
- ``registries``: Array of registry URLs to fetch assets from

You can preview the example config here:

.. dropdown::

    .. literalinclude:: ../../examples/scripts/utils/index.ts
        :language: typescript
        :dedent:


Listing assets
--------------

The asset namespace provides a ``list`` getter to retrieve all assets from configured registries.

.. before-after::

   .. code-block:: javascript

      // v0 - manually fetch from token standard service
      const tokenStandardService = new TokenStandardService(
          provider, logger, auth, false
      )
      const assetList = await tokenStandardService.registriesToAssets(
          registries.map((url) => url.href)
      )

   ---

   .. code-block:: javascript

      // v1 - use the asset namespace
      const asset = await sdk.asset(assetConfig)
      const assetList = asset.list

Finding a specific asset
------------------------

The ``find`` method allows you to search for a specific asset by ID, optionally filtering by registry URL.

.. before-after::

   .. code-block:: javascript

      // v0 - manually filter assets
      const tokenStandardService = new TokenStandardService(
          provider, logger, auth, false
      )
      const assets = await tokenStandardService.registriesToAssets(
          registries.map((url) => url.href)
      )
      const amuletAsset = assets.find(
          (asset) => asset.id === 'Amulet'
      )

   ---

   .. code-block:: javascript

      // v1 - use the find method
      const asset = await sdk.asset(assetConfig)
      const amuletAsset = await asset.find('Amulet')

Finding an asset with a specific registry
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

When multiple registries contain assets with the same ID, you can specify the registry URL to disambiguate:

.. code-block:: javascript

   const asset = await sdk.asset(assetConfig)
   const amuletAsset = await asset.find(
       'Amulet',
       new URL('https://registry.example.com')
   )

Error handling
--------------

The asset namespace includes built-in error handling for common scenarios:

**Asset not found**

If an asset with the specified ID does not exist in any registry:

.. code-block:: javascript

   try {
       const asset = await sdk.asset(assetConfig)
       const unknownAsset = await asset.find('NonExistentAsset')
   } catch (error) {
       // SDKError with type 'NotFound'
       // message: 'Asset with id NonExistentAsset not found'
   }

**Multiple assets found**

If multiple assets with the same ID exist across different registries and no registry URL is provided:

.. code-block:: javascript

   try {
       const asset = await sdk.asset(assetConfig)
       const duplicateAsset = await asset.find('CommonAsset')
   } catch (error) {
       // SDKError with type 'BadRequest'
       // message: 'Multiple assets found, please provide a registryUrl'
   }

Usage example
-------------

In the below example you can find the usage of the ``find`` method:

.. dropdown::

    .. literalinclude:: ../../examples/scripts/04-token-standard-allocation.ts
        :language: typescript
        :dedent:

Migration reference
-------------------

..  list-table:: Asset-related method migration
    :widths: 25 25
    :header-rows: 1

    * - v0 approach
      - v1 method
    * - ``tokenStandardService.registriesToAssets()``
      - ``sdk.asset(config)`` then ``asset.list``
    * - Manual array filtering for specific asset
      - ``asset.find(id, registryUrl?)``
    * - Manual error handling for missing assets
      - Built-in error handling in ``asset.find()``

See also
--------

- :ref:`wallet-sdk-config` - SDK configuration
- :ref:`token-migration-v1` - Token namespace migration
