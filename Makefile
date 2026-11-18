FILE=infra/docker-compose.yml

.PHONY: all up down build re logs ps clean-volumes inspect-health install env backup restore backups

all: env up

# first run: create infra/.env with generated secrets (never overwrites an existing one)
env:
	@test -f infra/.env && echo "infra/.env already exists" || { \
		cp infra/.env.example infra/.env; \
		sed -i "s#^POSTGRES_PASSWORD=.*#POSTGRES_PASSWORD=$$(openssl rand -hex 24)#" infra/.env; \
		sed -i "s#^BETTER_AUTH_SECRET=.*#BETTER_AUTH_SECRET=$$(openssl rand -base64 48)#" infra/.env; \
		sed -i "s#^INTERNAL_SERVICE_TOKEN=.*#INTERNAL_SERVICE_TOKEN=$$(openssl rand -base64 48)#" infra/.env; \
		sed -i "s#^GRAFANA_ADMIN_PASSWORD=.*#GRAFANA_ADMIN_PASSWORD=$$(openssl rand -hex 24)#" infra/.env; \
		sed -i "s#^SEED_DEV_DATA=.*#SEED_DEV_DATA=true#" infra/.env; \
		echo "created infra/.env"; }

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
	docker compose -f $(FILE) logs -f --tail=200 $(SERVICE)

ps:
	docker compose -f $(FILE) ps

# cleanup / inspect
install:
	@for dir in services/users services/game apps/web; do \
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

# ---- backups (see README: disaster recovery)
backup:
	docker compose -f $(FILE) exec backup /backup/backup.sh

backups:
	@ls -1t backups 2>/dev/null || echo "no backups yet"

# make restore DB=db-<stamp>.dump [UPLOADS=uploads-<stamp>.tar.gz]
restore:
	@test -n "$(DB)" || { echo "usage: make restore DB=db-<stamp>.dump [UPLOADS=uploads-<stamp>.tar.gz]"; exit 1; }
	docker compose -f $(FILE) stop users game
	docker compose -f $(FILE) exec backup /backup/restore.sh $(DB) $(UPLOADS); rc=$$?; \
	  docker compose -f $(FILE) start users game; exit $$rc
