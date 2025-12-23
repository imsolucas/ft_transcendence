FROM node:lts-trixie

RUN apt-get update && apt-get install -y curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app/

# Configure npm for better network reliability
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 300000

COPY package.json package-lock.json ./

# Use npm ci for faster, more reliable installs in Docker
# Retry on network failures
RUN npm ci || (sleep 5 && npm ci) || (sleep 10 && npm ci)

COPY . .

RUN ./init.sh dev

ARG PORT=4000
ENV PORT=$PORT

EXPOSE $PORT

ENTRYPOINT [ "npm", "run" ]
CMD [ "dev" ]
