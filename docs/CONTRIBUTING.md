# Contribution Guidelines

## Setup

### git "signed-off-by" commit

As a requirement under the hyperledger foundation, all commits must be signed off. This can be done by adding the `-s` flag every time you commit.

An alternative is to add the follow git hook (at `.git/hooks/prepare-commit-msg`):

```
#!/bin/sh

NAME=$(git config user.name)
EMAIL=$(git config user.email)

if [ -z "$NAME" ]; then
    echo "empty git config user.name"
    exit 1
fi

if [ -z "$EMAIL" ]; then
    echo "empty git config user.email"
    exit 1
fi

git interpret-trailers --if-exists doNothing --trailer \
    "Signed-off-by: $NAME <$EMAIL>" \
    --in-place "$1"
```

it is also recommended (but not required) to add a gpg key: https://docs.github.com/en/authentication/managing-commit-signature-verification/adding-a-gpg-key-to-your-github-account

### repo tooling

The easiest way to setup the repo for development is to install [direnv](https://direnv.net/) and the [nix package manager](https://nixos.org/). This guarantees that all contributors have identical dev environments on their machine. If set up correctly, then `cd`-ing into the repo root will automatically install all build tooling dependencies. To check that you've done this successfully, run

```sh
$ which node
/nix/store/gxr9abzyqmva25p3k142qs1djj9q5fqw-nodejs-22.14.0/bin/node
```

you should see an output similar to the above.

#### manual setup

If you'd rather avoid installing and using Nix, then ensure you've installed the following packages and their respective versions on your machine.

| Package | Version |
| ------- | ------- |
| NodeJS  | 22.14.0 |
| NPM     | 10.9.2  |
