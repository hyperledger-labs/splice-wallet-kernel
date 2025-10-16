User Management
===============

The Wallet SDK have functionality for creating and managing user rights, by default when you are connection it uses whichever
user is defined in your auth-controller. If the user is an admin user on the ledger api they can be used to create other
users and grant them rights.


How do i quickly setup canReadAsAnyParty and canExecuteAsAnyParty?
------------------------------------------------------------------

This script sets up three users `alice`, `bob` and `master`. `master` is given canReadAsAnyParty and canExecuteAsAnyParty
and it shows proper access control by creating parties and ensuring that `alice` and `bob` can not see each others parties.

.. literalinclude:: ../../examples/scripts/11-multi-user-setup.ts
    :language: typescript
    :dedent:


Creating a new user
-------------------

Creating a new user can be done using the adminLedger, this new user can then be granted rights or can create new parties as
needed.

.. literalinclude:: ../../examples/snippets/create-new-user.ts
    :language: typescript
    :dedent:

ReadAs and ActAs limitations
----------------------------

Currently when allocating a new party we also grant ReadAs and ActAs rights for that party for the submitting user. This allows
the user to do the normal flows involved like preparing transactions and executing those. There are performance issues if two many
of these rights are assigned to the same user, in the case of a `master` user that is interacting on behalf of a client, then it might
be more convenient to use `CanReadAsAnyParty` and `CanExecuteAsAnyParty` as described below.

Here is how the method changes if you need to allocate a party without granting rights:

.. literalinclude:: ../../examples/snippets/allocate-party-without-rights.ts
    :language: typescript
    :dedent:

CanReadAsAnyParty
-----------------

CanReadAsAnyParty gives an user full information about any party on the ledger, if a user is set up with this they will see:
1. All parties hosted on the ledger (multi-hosted and single hosted)
2. All transaction happening involving a party on the ledger
3. Prepare transactions on behalf of any party

This will not grant information about parties hosted on other ledgers or their transactions.

.. literalinclude:: ../../examples/snippets/can-read-as-any-party.ts
    :language: typescript
    :dedent:

The SDK automatically leverage this elevated permission for certain endpoints like `listWallets`.

CanExecuteAsAnyParty
--------------------

CanExecuteAsAnyParty gives full execution rights for a party, this means that a user with these rights can submit
transaction on behalf of a party hosted on the ledger.

**This does not give the user rights to move funds without a valid signature!**

The setup is similar to the `CanReadAsAnyParty`:

.. literalinclude:: ../../examples/snippets/can-execute-as-any-party.ts
    :language: typescript
    :dedent:
