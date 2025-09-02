FROM node:lts-trixie

RUN apt-get update && apt-get install -y curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app/

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

EXPOSE 3000

ENTRYPOINT [ "npm", "run" ]
CMD [ "dev" ]
