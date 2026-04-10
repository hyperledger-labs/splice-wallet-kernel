.. Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
.. SPDX-License-Identifier: Apache-2.0

.. _users-migration-v1:


Users
=======

The user namespace provides methods for user management on the Canton Network.


Key changes from v0 to v1
-------------------------

The distinction betwen the user ledger and admin ledger have been removed. Instead, the token is used to determine whether a user has admin rights.


**Creating users**

.. before-after::

   .. code-block:: javascript

      await sdk.adminLedger.createUser('userId', primaryParty)

   ---

   .. code-block:: javascript

      const result = await sdk.user
          .create({
            userId: 'userId',
            primaryParty: primaryParty,
            userRights: {...}
          })


**Granting user rights**

.. before-after::

   .. code-block:: javascript

      await sdk.userLedger.grantRights([actAsRights], [readAsRights])

   ---

   .. code-block:: javascript

      const result = await sdk.rights
          .grant({
            userRights: {...},
            userId: {'userId'}, //optional parameter
            idp: {'idp'} //optional parameter otherwise will use default IDP
          })

The below example demonstrates the full usage of the feature:

.. dropdown::

    .. literalinclude:: ../../examples/scripts/09-multi-user-setup.ts
        :language: javascript
        :dedent:


Migration reference
-------------------

..  list-table:: Party-related method migration
    :widths: 25 25
    :header-rows: 1

    * - v0 method
      - v1 method
   * - ``sdk.adminLedger.createUser``
     - ``sdk.user.create``
   * - ``sdk.userLedger.grantRights``
     - ``sdk.user.rights.grant``

See also
--------

- :ref:`wallet-sdk-config` - SDK configuration
- :ref:`user management` - User management overview
