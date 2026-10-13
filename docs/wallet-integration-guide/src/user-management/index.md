---
title: 'User Management'
description: 'Create users and configure ledger read/act rights, including canReadAsAnyParty and canExecuteAsAnyParty.'
---

The Wallet SDK has functionality for creating and managing user rights, by default when you are connecting it uses whichever user is defined in your token provider config. If the user is an admin user on the ledger api they can be used to create other users and grant them rights.

## How do I quickly setup canReadAsAnyParty and canExecuteAsAnyParty?

This script sets up three users `alice`, `bob` and `master`. `master` is given canReadAsAnyParty and canExecuteAsAnyParty and it shows proper access control by creating parties and ensuring that `alice` and `bob` can not see each others parties.

[`scripts/09-multi-user-setup.ts`](../../examples/scripts/09-multi-user-setup.ts) <!-- include -->
