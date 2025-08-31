FROM node:lts-trixie

WORKDIR /usr/src/app/

COPY package.json package-lock.json ./

RUN npm ci

RUN apt-get update && apt-get install -y curl \
    && rm -rf /var/lib/apt/lists/*

EXPOSE 3000

CMD [ "npm", "run", "dev" ]
