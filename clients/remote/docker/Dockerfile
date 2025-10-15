FROM cgr.dev/chainguard/node
COPY target/package.tgz /app/
RUN tar xzvf /app/package.tgz

WORKDIR /app/package
ENV NETWORK_CONFIG_PATH=./config.json
RUN npm install
CMD ["./dist/index.js"]
