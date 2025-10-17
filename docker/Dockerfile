FROM cgr.dev/chainguard/node
COPY target/ /app/
RUN npm install
ENTRYPOINT ["npx", "@canton-network/clients-remote", "-c", "./config.json"]
