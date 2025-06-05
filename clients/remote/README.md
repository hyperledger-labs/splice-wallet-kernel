# Canton Remote Wallet

The RPC-based (server-side) Wallet Client.

# How to run

This project comes with an express js server.

Start server:

```sh
yarn install
yarn build
yarn dev
```

The server now runs on [localhost:3000](http://localhost:3000/).

```shell
curl -i localhost:3000/api/hello
```

should return the following response:

```angular2html
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 27
{"message":"Hello, world!"}%
```
