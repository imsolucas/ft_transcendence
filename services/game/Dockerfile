FROM node:lts-trixie

RUN apt-get update && apt-get install -y curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app/

COPY package.json package-lock.json tsconfig.json ./

RUN npm ci

ARG PORT=3001
ENV PORT=$PORT

EXPOSE $PORT

ENTRYPOINT [ "npm", "run" ]
CMD [ "dev" ]
