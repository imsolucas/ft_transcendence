FROM alpine:3.22.1

RUN apk update && apk add sqlite
WORKDIR /db

ENTRYPOINT [ "sqlite3" ]
