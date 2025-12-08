FROM node:lts-trixie

RUN apt-get update && apt-get install -y curl \
    && rm -rf /var/lib/apt/lists/*

ARG PORT=3001

WORKDIR /usr/src/app/

COPY package.json package-lock.json tsconfig.json ./

RUN npm ci

EXPOSE $PORT

ENTRYPOINT [ "npm", "run" ]
CMD [ "dev" ]
