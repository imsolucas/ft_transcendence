# Deploying VOLLEY.EXE on a real domain

One server, one domain, Docker Compose. Caddy gets the HTTPS certificate from Let's Encrypt
automatically, so there are no certificate files to manage.

## No email provider yet?

**Free, no domain needed: Gmail SMTP.** Turn on 2-Step Verification on the Google account, create
an *app password* (Google Account → Security → App passwords), then:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=<the 16-character app password>
SMTP_FROM=VOLLEY.EXE <you@gmail.com>
```

Gmail allows a few hundred emails a day, plenty for a small community. Later, switch to a provider
on your own domain by changing these lines.

**No email at all (for now):** `REQUIRE_EMAIL_VERIFICATION=false`. Sign-up then works without a
verification link (the account is created and the player logs in), but nothing can be emailed:
no password reset, no "new sign-in" alerts, and nobody proves they own their address (someone
could register with another person's email). Turn it back on (`true`) once SMTP is set up;
accounts made in the meantime are asked to verify on their next sign-in.

## No domain yet? Cloudflare Tunnel

You can go live without buying a domain: a Cloudflare Tunnel gives the app a public HTTPS
address, Cloudflare handles the certificate, and **no port is opened** on the server (the
`cloudflared` container connects out to Cloudflare; Caddy publishes nothing). Steps 2 and 3
(DNS records, firewall rules for 80/443) are then not needed; everything else applies.

**Quick tunnel (free, no Cloudflare account):** a random `https://<words>.trycloudflare.com`.

```bash
# infra/.env (plus the SMTP / SEED_DEV_DATA lines from step 4)
COMPOSE_PROFILES=ai,quick-tunnel

make prod            # starts everything + the tunnel, then sets PUBLIC_ORIGIN to its address
```

`make prod` waits for the tunnel's `https://….trycloudflare.com` address and writes it into
`PUBLIC_ORIGIN` for you (`make tunnel-origin` does just that step again).

Cloudflare meant quick tunnels for testing: the address **changes every time the tunnel
restarts** (`make prod` picks up the new one; after any other restart run `make tunnel-origin`, or the game
refuses connections from the new address. Everyone has to sign in again; passkeys made for
the old address stop working), there is a cap on simultaneous requests, and streamed responses
(the Coach's answers) may not get through.

**Named tunnel (stable address, still free):** needs a free Cloudflare account and a domain whose
DNS is on Cloudflare (a cheap domain, or one you already have). In the Cloudflare dashboard:
Zero Trust → Networks → Tunnels → create a tunnel (type *cloudflared*), copy its token, and add a
public hostname (e.g. `volley.example.com`) pointing to the service `http://caddy:80`.

```bash
# infra/.env
COMPOSE_PROFILES=ai,tunnel
CLOUDFLARE_TUNNEL_TOKEN=<token from the dashboard>
PUBLIC_ORIGIN=https://volley.example.com

make prod
```

Always start with `make prod` (not `make up`): only it adds `infra/docker-compose.tunnel.yml`,
which switches Caddy to the tunnel config and unpublishes its ports (needs Docker Compose 2.24+).

Inside Docker, Caddy trusts any address on the internal network to report the visitor's IP
(that's how the tunnel passes it on). Fine for a single-server setup; don't run untrusted
containers on that network.

**Changing the address later** (any mode): `make set-origin ORIGIN=https://new-address`. It
updates `PUBLIC_ORIGIN` (and `SITE_ADDRESS` for a direct domain) in `infra/.env` and restarts the
services that read it. Moving from a quick tunnel to a real domain later is just that, plus
switching the profile.

## 1. What you need

| | Minimum | Notes |
|---|---|---|
| A server (VPS) | 2 vCPU, 4 GB RAM, 40 GB disk, Ubuntu 24.04 | With the local Coach (Ollama). Without it (remote `AI_BASE_URL` or Coach off): 2 GB RAM, 20 GB disk. |
| A domain | e.g. `volley.example.com` | Any registrar. A subdomain is fine. |
| An email provider (SMTP) | Free: Gmail with an app password (no domain needed), or the free tiers of Resend, Brevo, Mailgun, … | Sign-in waits for email verification. No provider yet: see "No email provider yet" below. |
| Optional: Cloudflare Turnstile keys | Free | Bot check on sign-up / sign-in / reset. |

## 2. Point the domain at the server

At your DNS provider, add an **A record** for the domain (or subdomain) with the server's public
IPv4 address (and an **AAAA** record if the server has IPv6; Let's Encrypt then connects over
IPv6, so ports 80/443 must be open for IPv6 too, which ufw does by default). Wait until it
resolves:

```bash
getent ahostsv4 volley.example.com   # must print the server's IP
```

## 3. Prepare the server

```bash
# Docker + Compose plugin (official convenience script)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker

# Firewall: SSH, HTTP (certificate challenges + redirect), HTTPS (TCP + UDP for HTTP/3)
sudo ufw allow 22/tcp && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw allow 443/udp
sudo ufw enable
```

## 4. Configure

```bash
git clone <your repository URL> volley && cd volley
make env        # creates infra/.env with fresh secrets (local defaults)
nano infra/.env
```

Change these lines in `infra/.env`:

```bash
PUBLIC_ORIGIN=https://volley.example.com
SITE_ADDRESS=volley.example.com
TLS_MODE=you@example.com            # Let's Encrypt account email
CADDY_HTTPS_PORT=443
HTTPS_PORT=443
HTTP_PORT=80

SEED_DEV_DATA=false                 # never seed dev accounts on a public server
COMPOSE_PROFILES=ai                 # local Coach; leave empty for none (drop "mail"!)

SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=VOLLEY.EXE <no-reply@volley.example.com>

# optional
TURNSTILE_SITE_KEY=...
TURNSTILE_SECRET_KEY=...
```

Leave HSTS off for the very first start (step 6 turns it on).

## 5. Check and start

```bash
make deploy-check   # validates infra/.env and this machine; fix every ✖
make prod           # runs the check again, then builds and starts with the production overrides
```

`make prod` uses `infra/docker-compose.prod.yml` on top of the normal compose file: rotated logs
(10 MB × 5 per service), HTTP/3, and a 3 GB memory cap on the Coach model. The users service also
refuses to start on a public origin with `SEED_DEV_DATA=true` or without a real `SMTP_HOST`.

The first start takes a few minutes (image builds, then the Coach model download of about 1 GB).
Watch it with `make prod-logs` (or `make prod-logs SERVICE=caddy` for the certificate).

## 6. After the first start

1. Open `https://volley.example.com`: the certificate should be valid (from Let's Encrypt).
2. Open `/en/status`: the API, database and game server should all be up.
3. Create your account: the verification email must arrive (check spam the first time).
4. Turn on HSTS (browsers then refuse plain HTTP for a year), then apply it with `make prod`:
   ```bash
   # in infra/.env
   HSTS_HEADER='Strict-Transport-Security "max-age=31536000; includeSubDomains"'
   make prod
   ```
5. Add a passkey in Settings → Security. Passkeys are tied to the domain, so ones made on
   `localhost` never carry over, and moving to another domain later means adding new ones.

## Day-to-day

| Task | Command |
|---|---|
| Update to the latest code | `git pull && make prod` (database migrations run on start) |
| Stop / full restart | `make prod-down` · `make prod-re` (never plain `make up/down/re` on the server: they drop the production overrides) |
| Logs | `make prod-logs` · `make prod-logs SERVICE=users` |
| Status | `docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml ps` |
| Backup now | `make backup` (scheduled backups run daily into `backups/`) |
| Restore | `make restore DB=db-<stamp>.dump [UPLOADS=uploads-<stamp>.tar.gz]` |

Backups stay on the same server: copy `backups/` somewhere else regularly (another machine or
object storage), or a lost server loses them too. The dumps contain password hashes and 2FA
secrets, so keep the copies private.

Keep `POSTGRES_PASSWORD` as it was on the first start: Postgres sets it when the database
volume is created and ignores a changed value afterwards (the services would then fail to
connect).

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Browser shows a certificate warning | DNS doesn't point here yet, or port 80 is blocked (Let's Encrypt can't reach Caddy). `make prod-logs SERVICE=caddy`. |
| `users` keeps restarting | A config check failed: `make prod-logs SERVICE=users` names the variable. |
| No verification email | Wrong SMTP credentials, or the provider hasn't verified your domain yet. |
| Coach says it can't be reached | The model is still downloading (`SERVICE=ollama-pull`), or the server is short on RAM. |
| Sign-in works but the game doesn't connect | Something in front of Caddy (a CDN or proxy) blocks WebSockets on `/ws`. |
