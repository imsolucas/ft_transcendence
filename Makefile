FILE=infra/docker-compose.yml

.PHONY: all up down build re logs ps clean-volumes inspect-health install env backup restore backups deploy-check prod prod-logs prod-down prod-re set-origin tunnel-origin

all: env up

# first run: create infra/.env with generated secrets (never overwrites an existing one)
env:
	@test -f infra/.env && echo "infra/.env already exists" || { \
		cp infra/.env.example infra/.env; \
		sed -i "s#^POSTGRES_PASSWORD=.*#POSTGRES_PASSWORD=$$(openssl rand -hex 24)#" infra/.env; \
		sed -i "s#^BETTER_AUTH_SECRET=.*#BETTER_AUTH_SECRET=$$(openssl rand -base64 48)#" infra/.env; \
		sed -i "s#^INTERNAL_SERVICE_TOKEN=.*#INTERNAL_SERVICE_TOKEN=$$(openssl rand -base64 48)#" infra/.env; \
		sed -i "s#^SEED_DEV_DATA=.*#SEED_DEV_DATA=true#" infra/.env; \
		sed -i "s#^SMTP_HOST=.*#SMTP_HOST=mailpit#; s#^SMTP_PORT=.*#SMTP_PORT=1025#; s#^COMPOSE_PROFILES=.*#COMPOSE_PROFILES=mail,ai#; s#^AI_BASE_URL=.*#AI_BASE_URL=http://ollama:11434/v1#" infra/.env; \
		echo "created infra/.env"; }

# ---- production (see docs/DEPLOY.md): check infra/.env, then start with the prod overrides.
# Behind a Cloudflare Tunnel (COMPOSE_PROFILES contains tunnel or quick-tunnel) the tunnel
# override is added: Caddy serves plain HTTP inside Docker and publishes no port.
# one detector for the mode, shared with deploy-check (same parsing of infra/.env)
MODE := $(shell bash infra/scripts/deploy-check.sh --mode 2>/dev/null)
TUNNEL_MODE := $(filter tunnel quick-tunnel,$(MODE))
PROD = docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml $(if $(TUNNEL_MODE),-f infra/docker-compose.tunnel.yml)

deploy-check:
	@bash infra/scripts/deploy-check.sh

prod: deploy-check
	$(PROD) up -d --build --remove-orphans
ifeq ($(MODE),quick-tunnel)
	@echo "waiting for the quick tunnel's address…"; \
	  for i in $$(seq 1 30); do $(MAKE) --no-print-directory -s tunnel-origin >/dev/null 2>&1 && break; sleep 2; done; \
	  grep '^PUBLIC_ORIGIN=' infra/.env
endif

prod-logs:
	$(PROD) logs -f --tail=200 $(SERVICE)

# on the server use these, never plain `make up/down/re` (they would drop the prod overrides)
prod-down:
	$(PROD) down $(SERVICE)

prod-re: deploy-check prod-down prod

# Set (or change) the public address, then restart what reads it:
#   make set-origin ORIGIN=https://volley.example.com
# On a real domain this also sets SITE_ADDRESS (Caddy's certificate name).
set-origin:
	@printf '%s' "$(ORIGIN)" | grep -Eq '^https://[A-Za-z0-9.-]+/?$$' || { echo "usage: make set-origin ORIGIN=https://your-host (no port or path)"; exit 1; }
	@o=$$(printf '%s' "$(ORIGIN)" | sed 's#/$$##'); h=$${o#https://}; \
	  sed -i "s#^PUBLIC_ORIGIN=.*#PUBLIC_ORIGIN=$$o#" infra/.env; \
	  if [ -z "$(TUNNEL_MODE)" ]; then sed -i "s#^SITE_ADDRESS=.*#SITE_ADDRESS=$$h#" infra/.env; fi; \
	  echo "PUBLIC_ORIGIN=$$o"
	$(PROD) up -d users game caddy

# Quick tunnel: read the current https://<name>.trycloudflare.com from its logs and use it
tunnel-origin:
	@url=$$($(PROD) logs cloudflared-quick 2>/dev/null | grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' | grep -v '^https://api\.' | tail -1); \
	  if [ -z "$$url" ]; then echo "no quick-tunnel address yet: is COMPOSE_PROFILES=...,quick-tunnel and did 'make prod' start it?"; exit 1; fi; \
	  $(MAKE) --no-print-directory set-origin ORIGIN=$$url

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
