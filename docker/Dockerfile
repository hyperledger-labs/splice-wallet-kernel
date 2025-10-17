FROM cgr.dev/chainguard/node
COPY target/ /app/
RUN npm install
ENTRYPOINT ["npx", "@canton-network/wallet-gateway-remote", "-c", "./config.json"]
