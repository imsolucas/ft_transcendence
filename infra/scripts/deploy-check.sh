#!/usr/bin/env bash
# Checks infra/.env (and this machine) before a production deploy. Exit 1 on any error.
#   make deploy-check
set -uo pipefail
# resolve an ENV_FILE override before changing directory (a relative path stays valid)
if [ -n "${ENV_FILE:-}" ]; then ENV_FILE=$(realpath "$ENV_FILE"); fi
cd "$(dirname "$0")/.."
ENV_FILE=${ENV_FILE:-$PWD/.env}
errors=0
warnings=0
ok()   { printf '  \033[32m✔\033[0m %s\n' "$1"; }
bad()  { printf '  \033[31m✖\033[0m %s\n' "$1"; errors=$((errors + 1)); }
warn() { printf '  \033[33m!\033[0m %s\n' "$1"; warnings=$((warnings + 1)); }

[ -f "$ENV_FILE" ] || { echo "infra/.env is missing: run 'make env' first, then edit it (see docs/DEPLOY.md)"; exit 1; }
# value of KEY, read like Compose does: CRLF, an `export ` prefix, quotes and (unquoted) inline comments
get() {
  local v
  v=$(tr -d '\r' < "$ENV_FILE" | sed -E 's/^export[[:space:]]+//' | grep -E "^$1=" | tail -1 | cut -d= -f2-)
  case "$v" in
    \"*) v=${v#\"}; v=${v%%\"*} ;;
    \'*) v=${v#\'}; v=${v%%\'*} ;;
    *) v=$(printf '%s' "$v" | sed -E 's/[[:space:]]+#.*$//; s/[[:space:]]+$//') ;;
  esac
  printf '%s' "$v"
}
lower() { printf '%s' "$1" | tr '[:upper:]' '[:lower:]'; }

PROFILES=",$(get COMPOSE_PROFILES | tr -d '[:space:]'),"
MODE=direct
case "$PROFILES" in *,quick-tunnel,*) MODE=quick-tunnel ;; *,tunnel,*) MODE=tunnel ;; esac
# `deploy-check.sh --mode` prints direct / tunnel / quick-tunnel (the Makefile uses it, so both agree)
if [ "${1:-}" = "--mode" ]; then echo "$MODE"; exit 0; fi

if [ "$MODE" != direct ]; then
  echo "Cloudflare Tunnel ($MODE): Cloudflare provides HTTPS, no ports or DNS to set up here"
  ORIGIN=$(get PUBLIC_ORIGIN)
  HOST=$(lower "$(printf '%s' "$ORIGIN" | sed -E 's#^https://([^/:]+).*#\1#')")
  if [ "$MODE" = quick-tunnel ]; then
    case "$ORIGIN" in
      https://*.trycloudflare.com) ok "PUBLIC_ORIGIN=$ORIGIN (a quick-tunnel address changes when the tunnel restarts: make tunnel-origin)" ;;
      *) warn "PUBLIC_ORIGIN is '$ORIGIN': after 'make prod', run 'make tunnel-origin' to use the tunnel's address" ;;
    esac
  else
    [ -n "$(get CLOUDFLARE_TUNNEL_TOKEN)" ] && ok "CLOUDFLARE_TUNNEL_TOKEN is set" || bad "set CLOUDFLARE_TUNNEL_TOKEN (Cloudflare dashboard → Zero Trust → Networks → Tunnels)"
    if [[ "$ORIGIN" =~ ^https://[A-Za-z0-9.-]+/?$ ]] && [[ "$HOST" != localhost && "$HOST" != *.localhost ]]; then ok "PUBLIC_ORIGIN=$ORIGIN (must equal the tunnel's public hostname)"
    else bad "PUBLIC_ORIGIN must be https://<the tunnel's public hostname>"; fi
  fi
else
echo "Domain and TLS"
ORIGIN=$(get PUBLIC_ORIGIN)
HOST=$(lower "$(printf '%s' "$ORIGIN" | sed -E 's#^https://([^/:]+).*#\1#')")
if [[ ! "$ORIGIN" =~ ^https://[A-Za-z0-9.-]+/?$ ]]; then
  bad "PUBLIC_ORIGIN must be exactly https://your-domain (no port, path or IP literal); is '$ORIGIN'"
elif [[ "$HOST" =~ ^[0-9.]+$ ]] || [[ "$HOST" == localhost || "$HOST" == *.localhost ]]; then
  bad "PUBLIC_ORIGIN needs a real domain name (Let's Encrypt doesn't issue for '$HOST')"
else
  ok "PUBLIC_ORIGIN=$ORIGIN"
fi
[ "$(lower "$(get SITE_ADDRESS)")" = "$HOST" ] && ok "SITE_ADDRESS matches ($HOST)" || bad "SITE_ADDRESS must be exactly '$HOST' (is '$(get SITE_ADDRESS)')"
case "$(get TLS_MODE)" in
  *@*) ok "TLS_MODE is an email: Let's Encrypt certificates" ;;
  *) bad "TLS_MODE must be your email address (Let's Encrypt), not '$(get TLS_MODE)'" ;;
esac
[ "$(get HTTPS_PORT)" = "443" ] && [ "$(get CADDY_HTTPS_PORT)" = "443" ] && ok "HTTPS on 443" || bad "set HTTPS_PORT=443 and CADDY_HTTPS_PORT=443"
[ "$(get HTTP_PORT)" = "80" ] && ok "HTTP on 80 (certificate challenges and redirects)" || bad "set HTTP_PORT=80 (Let's Encrypt needs it)"
case "$(get HSTS_HEADER)" in
  *max-age=*) ok "HSTS enabled" ;;
  *) warn "HSTS is off: set HSTS_HEADER='Strict-Transport-Security \"max-age=31536000; includeSubDomains\"' once HTTPS works" ;;
esac

fi

echo "Secrets"
for k in BETTER_AUTH_SECRET INTERNAL_SERVICE_TOKEN; do
  v=$(get "$k"); [ "${#v}" -ge 32 ] && ok "$k is set (${#v} chars)" || bad "$k is missing or shorter than 32 characters (openssl rand -base64 48)"
done
v=$(get POSTGRES_PASSWORD); [ "${#v}" -ge 16 ] && ok "POSTGRES_PASSWORD is set" || bad "POSTGRES_PASSWORD is missing or short (openssl rand -hex 24)"

echo "Email and accounts"
[ "$(get SEED_DEV_DATA)" = "false" ] && ok "dev accounts are not seeded" || bad "set SEED_DEV_DATA=false (the dev accounts have well-known passwords)"
SMTP=$(get SMTP_HOST)
NO_EMAIL=$([ "$(get REQUIRE_EMAIL_VERIFICATION)" = "false" ] && echo yes)
case "$SMTP" in
  ""|mailpit)
    if [ -n "$NO_EMAIL" ]; then warn "no email provider (REQUIRE_EMAIL_VERIFICATION=false): sign-up works, but password reset, verification and sign-in alerts can't be sent"
    else bad "SMTP_HOST must be a real mail provider (sign-in waits for email verification), or set REQUIRE_EMAIL_VERIFICATION=false to run without email for now"; fi ;;
  *) ok "SMTP_HOST=$SMTP" ;;
esac
if [ -n "$SMTP" ] && [ "$SMTP" != mailpit ]; then
  [ -n "$(get SMTP_USER)" ] && [ -n "$(get SMTP_PASS)" ] && ok "SMTP credentials set" || warn "SMTP_USER / SMTP_PASS are empty (most providers need them)"
  case "$(get SMTP_FROM)" in
    *localhost*|"") bad "SMTP_FROM must be a real sender address, e.g. 'VOLLEY.EXE <no-reply@$HOST>' (or your Gmail address with Gmail SMTP)" ;;
    *) ok "SMTP_FROM=$(get SMTP_FROM)" ;;
  esac
fi
case ",$(get COMPOSE_PROFILES)," in
  *,mail,*) bad "remove 'mail' from COMPOSE_PROFILES (Mailpit is for local testing only)" ;;
  *) ok "no Mailpit" ;;
esac

echo "Coach"
case ",$(get COMPOSE_PROFILES)," in
  *,ai,*)
    mem=$(awk '/MemTotal/ {print int($2/1024/1024)}' /proc/meminfo 2>/dev/null || echo 0)
    [ "$mem" -ge 4 ] && ok "local Ollama, ${mem} GB RAM" || warn "local Ollama wants 4 GB+ RAM (this machine: ${mem} GB); consider a remote AI_BASE_URL"
    ;;
  *) [ -n "$(get AI_BASE_URL)" ] && ok "remote coach at $(get AI_BASE_URL)" || warn "Coach is off (AI_BASE_URL empty)" ;;
esac

echo "This machine"
command -v docker >/dev/null && docker compose version >/dev/null 2>&1 && ok "Docker Compose available" || bad "install Docker with the compose plugin"
if [ "$MODE" = direct ] && command -v ss >/dev/null; then
  # ours = this project's caddy publishes it
  ours=$(docker compose -f docker-compose.yml ps caddy --format '{{.Ports}}' 2>/dev/null || true)
  for spec in "80 tcp" "443 tcp" "443 udp"; do
    set -- $spec
    if [ "$2" = tcp ]; then busy=$(ss -Htln "( sport = :$1 )" 2>/dev/null); else busy=$(ss -Huln "( sport = :$1 )" 2>/dev/null); fi
    if [ -z "$busy" ] || printf '%s' "$ours" | grep -q ":$1->$1/$2"; then ok "port $1/$2 is free (or ours)"
    else bad "port $1/$2 is used by another program"; fi
  done
fi
if [ "$MODE" = direct ] && [ -n "$HOST" ] && command -v getent >/dev/null; then
  ips=$(getent ahostsv4 "$HOST" | awk '{print $1}' | sort -u | tr '\n' ' ')
  ips6=$(getent ahostsv6 "$HOST" | awk '$1 ~ /:/ && $1 !~ /^::ffff:/ {print $1}' | sort -u | tr '\n' ' ')
  if [ -n "$ips6" ]; then warn "$HOST has an AAAA record ($ips6): Let's Encrypt prefers IPv6, so open 80/443 for IPv6 too (ufw does by default)"; fi
  if [ -z "$ips" ] && [ -n "$ips6" ]; then warn "$HOST has no A record (IPv6 only): visitors without IPv6 can't reach it"
  elif [ -z "$ips" ]; then bad "$HOST does not resolve yet: add an A record pointing to this server"
  else
    mine=$(hostname -I 2>/dev/null)
    matched=0; for ip in $ips; do case " $mine " in *" $ip "*) matched=1 ;; esac; done
    [ $matched = 1 ] && ok "$HOST → $ips (this machine)" || warn "$HOST → $ips; this machine has: $mine (fine behind NAT/cloud public IPs, otherwise fix the A record)"
  fi
fi

echo
if [ $errors -gt 0 ]; then echo "✖ $errors error(s), $warnings warning(s): fix infra/.env, then run 'make deploy-check' again."; exit 1; fi
echo "✔ ready to deploy ($warnings warning(s)): make prod"
