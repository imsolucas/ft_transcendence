FILE=infra/docker-compose.yml

.PHONY: all up down build logs ps clean-volumes inspect-health restart reset

all: up

# basic lifecycle
up:
	docker compose -f $(FILE) up -d --build

down:
	docker compose -f $(FILE) down

build:
	docker compose -f $(FILE) build

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

restart:
	docker compose -f $(FILE) down && docker compose -f $(FILE) up -d --build

reset:
	@docker compose -f $(FILE) down
	@docker compose -f $(FILE) down -v --remove-orphans
	@docker system prune -af
	@docker compose -f $(FILE) up -d --build
	
