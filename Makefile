FILE=infra/docker-compose.yml

.PHONY: all up down build re logs ps clean-volumes inspect-health

all: up

# basic lifecycle
up:
	docker compose -f $(FILE) up -d --build

stop:
	docker compose -f $(FILE) stop

down:
	docker compose -f $(FILE) down

build:
	docker compose -f $(FILE) build

re: down up

# logs / status
logs:
	docker compose -f $(FILE) logs -f --tail=200

ps:
	docker compose -f $(FILE) ps

# cleanup / inspect
clean-volumes:
	docker compose -f $(FILE) down -v --remove-orphans

inspect-health:
	docker inspect --format '{{json .State.Health}}' $(SERVICE) || true
