FROM node:12.16-alpine

WORKDIR /app

# Copy dependency definition files first to leverage Docker layer caching
COPY package.json package-lock.json* bower.json .bowerrc patch-dependencies.js /app/

RUN apk upgrade --update \
    && apk add bash git ca-certificates \
    && npm install -g bower \
    && npm --unsafe-perm --production install \
    && node patch-dependencies.js \
    && apk del git \
    && rm -rf /var/cache/apk/*

# Copy the rest of the application code
COPY . /app

RUN adduser -H -S -g "Konga service owner" -D -u 1200 -s /sbin/nologin konga \
    && mkdir -p /app/kongadata /app/.tmp \
    && chown -R 1200:1200 /app/views /app/kongadata /app/.tmp \
    && sed -i -e 's/\r$//' /app/start.sh \
    && chmod +x /app/start.sh

EXPOSE 1337

VOLUME /app/kongadata

ENTRYPOINT ["/app/start.sh"]
