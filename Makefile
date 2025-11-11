FILE=infra/docker-compose.yml

.PHONY: all up down build re logs ps clean-volumes inspect-health

all: up

# basic lifecycle
up:
	docker compose -f $(FILE) up -d --build $(SERVICE)

start:
	docker compose -f $(FILE) start

stop:
	docker compose -f $(FILE) stop

down:
	docker compose -f $(FILE) down $(SERVICE)

build:
	docker compose -f $(FILE) build $(SERVICE)

re: down up

rebuild: fclean up

# logs / status
logs:
	docker compose -f $(FILE) logs -f --tail=200

ps:
	docker compose -f $(FILE) ps

# cleanup / inspect
clean: down clean-volumes

fclean: clean prune-cache

clean-volumes:
	docker compose -f $(FILE) down -v --remove-orphans

inspect-health:
	docker inspect --format '{{json .State.Health}}' $(SERVICE) || true

prune-cache:
	docker builder prune --all --force
