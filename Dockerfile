FROM node:20-alpine

COPY . /app

WORKDIR /app

RUN apk upgrade --update \
    && apk add bash ca-certificates \
    && rm -rf /var/cache/apk/* \
        /app/.git \
        /app/screenshots \
        /app/test \
    && adduser -H -S -g "Konga service owner" -D -u 1200 -s /sbin/nologin konga \
    && mkdir -p /app/kongadata /app/.tmp \
    && chown -R 1200:1200 /app/views /app/kongadata /app/.tmp

EXPOSE 1337

VOLUME /app/kongadata

ENTRYPOINT ["/app/start.sh"]
