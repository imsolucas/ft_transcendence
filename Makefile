FILE=infra/docker-compose.yml

.PHONY: all up down build re logs ps clean-volumes inspect-health install

all: up

# basic lifecycle
up:
	docker compose -f $(FILE) up -d --build

start:
	docker compose -f $(FILE) start

stop:
	docker compose -f $(FILE) stop

down:
	docker compose -f $(FILE) down

build:
	docker compose -f $(FILE) build

re: down up

rebuild: fclean up

# logs / status
logs:
	docker compose -f $(FILE) logs -f --tail=200

ps:
	docker compose -f $(FILE) ps

# cleanup / inspect
install:
	@for dir in services/*; do \
		if [ $$dir = "services/shared" ]; then \
			continue; \
		fi; \
		echo "Cleaning and intalling modules in $$dir"; \
		rm -rf $$dir/node_modules $$dir/package-lock.json 1>/dev/null; \
		(cd $$dir && npm install 1>/dev/null); \
		echo "Done"; \
	done;

clean: down clean-volumes

fclean: clean prune-cache

clean-volumes:
	docker compose -f $(FILE) down -v --remove-orphans

inspect-health:
	docker inspect --format '{{json .State.Health}}' $(SERVICE) || true

prune-cache:
	docker builder prune --all --force
