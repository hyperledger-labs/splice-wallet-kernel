To preview the docs:

Run this once from the `docs/wallet-integration-guide` directory:

```sh
poetry install
poetry env use 3.13
poetry update package
```

Run this to start the docs server:

```sh
poetry run sphinx-autobuild -c . src build -W
```
