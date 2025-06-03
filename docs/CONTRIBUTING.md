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


