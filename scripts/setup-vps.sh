#!/usr/bin/env bash
set -euo pipefail

VPS_HOST="${VPS_HOST:-}"
VPS_USER="${VPS_USER:-}"
VPS_SSH_PORT="${VPS_SSH_PORT:-22}"
DOMAIN="${DOMAIN:-rybasvprud.ru}"
WWW_DOMAIN="${WWW_DOMAIN:-www.${DOMAIN}}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"
WEB_ROOT="${WEB_ROOT:-/var/www/${DOMAIN}}"
SKIP_CERTBOT="${SKIP_CERTBOT:-0}"

if [[ -z "$VPS_HOST" || -z "$VPS_USER" || -z "$CERTBOT_EMAIL" ]]; then
  cat <<USAGE
Ошибка: не заданы обязательные переменные.

Нужно перед запуском:
  export VPS_HOST=<ip_или_hostname>
  export VPS_USER=<ssh_user>
  export CERTBOT_EMAIL=<email_для_letsencrypt>

Опционально:
  export VPS_SSH_PORT=22
  export DOMAIN=rybasvprud.ru
  export WWW_DOMAIN=www.rybasvprud.ru
  export WEB_ROOT=/var/www/rybasvprud.ru
  export SKIP_CERTBOT=1     # пропустить выпуск SSL (если DNS еще не переключен)
USAGE
  exit 1
fi

if ! command -v ssh >/dev/null 2>&1; then
  echo "Ошибка: ssh не найден." >&2
  exit 1
fi

echo "Подключение к ${VPS_USER}@${VPS_HOST}:${VPS_SSH_PORT}"
ssh -t -p "$VPS_SSH_PORT" "${VPS_USER}@${VPS_HOST}" \
  "DOMAIN='${DOMAIN}' WWW_DOMAIN='${WWW_DOMAIN}' WEB_ROOT='${WEB_ROOT}' CERTBOT_EMAIL='${CERTBOT_EMAIL}' DEPLOY_USER='${VPS_USER}' SKIP_CERTBOT='${SKIP_CERTBOT}' bash -s" <<'REMOTE'
set -euo pipefail

if ! command -v apt-get >/dev/null 2>&1; then
  echo "Ошибка: этот скрипт рассчитан на Ubuntu/Debian (apt-get)." >&2
  exit 1
fi

sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx rsync

sudo mkdir -p "$WEB_ROOT"
sudo chown -R "$DEPLOY_USER":"$DEPLOY_USER" "$WEB_ROOT"

sudo tee "/etc/nginx/sites-available/$DOMAIN" >/dev/null <<NGINX
server {
  listen 80;
  listen [::]:80;
  server_name $DOMAIN $WWW_DOMAIN;

  root $WEB_ROOT;
  index index.html;

  location / {
    try_files \$uri \$uri/ =404;
  }
}
NGINX

sudo ln -sfn "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"
if [[ -f /etc/nginx/sites-enabled/default ]]; then
  sudo rm -f /etc/nginx/sites-enabled/default
fi

sudo nginx -t
sudo systemctl reload nginx

if [[ "$SKIP_CERTBOT" == "1" ]]; then
  echo "SKIP_CERTBOT=1: выпуск SSL пропущен."
else
  if ! sudo certbot --nginx \
    --non-interactive \
    --agree-tos \
    --redirect \
    -m "$CERTBOT_EMAIL" \
    -d "$DOMAIN" \
    -d "$WWW_DOMAIN"; then
    echo "Предупреждение: certbot не смог выпустить сертификат." >&2
    echo "Проверьте DNS (A-записи домена должны указывать на VPS) и повторите setup-vps." >&2
  fi
fi

sudo nginx -t
sudo systemctl reload nginx
REMOTE

echo "Готово: сервер настроен под $DOMAIN и $WWW_DOMAIN"
echo "Дальше запустите деплой статики: npm run deploy:vps"
