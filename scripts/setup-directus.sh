#!/usr/bin/env bash
# Устанавливает Directus на VPS в Docker + настраивает nginx для admin.rybasvprud.ru
set -euo pipefail

VPS_HOST="${VPS_HOST:-}"
VPS_USER="${VPS_USER:-}"
VPS_SSH_PORT="${VPS_SSH_PORT:-22}"
DOMAIN="${DOMAIN:-rybasvprud.ru}"
ADMIN_DOMAIN="admin.${DOMAIN}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"
DIRECTUS_DIR="${DIRECTUS_DIR:-/opt/directus}"
DIRECTUS_PORT="${DIRECTUS_PORT:-8055}"

DIRECTUS_SECRET="${DIRECTUS_SECRET:-$(openssl rand -hex 32)}"
DIRECTUS_ADMIN_EMAIL="${DIRECTUS_ADMIN_EMAIL:-admin@${DOMAIN}}"
DIRECTUS_ADMIN_PASSWORD="${DIRECTUS_ADMIN_PASSWORD:-}"

SKIP_CERTBOT="${SKIP_CERTBOT:-0}"

if [[ -z "$VPS_HOST" || -z "$VPS_USER" || -z "$CERTBOT_EMAIL" || -z "$DIRECTUS_ADMIN_PASSWORD" ]]; then
  cat <<USAGE
Ошибка: не заданы обязательные переменные.

Обязательно:
  export VPS_HOST=<ip_или_hostname>
  export VPS_USER=<ssh_user>
  export CERTBOT_EMAIL=<email>
  export DIRECTUS_ADMIN_PASSWORD=<пароль_для_входа>

Опционально:
  export VPS_SSH_PORT=22
  export DOMAIN=rybasvprud.ru
  export DIRECTUS_SECRET=<случайная_строка>          # генерируется автоматически
  export DIRECTUS_ADMIN_EMAIL=admin@rybasvprud.ru
  export DIRECTUS_DIR=/opt/directus
  export SKIP_CERTBOT=1   # если DNS еще не переключен
USAGE
  exit 1
fi

echo "Подключение к ${VPS_USER}@${VPS_HOST}:${VPS_SSH_PORT}"
echo "Будет настроен: https://${ADMIN_DOMAIN}"
echo ""

ssh -t -p "$VPS_SSH_PORT" "${VPS_USER}@${VPS_HOST}" \
  "ADMIN_DOMAIN='${ADMIN_DOMAIN}' \
   CERTBOT_EMAIL='${CERTBOT_EMAIL}' \
   DIRECTUS_DIR='${DIRECTUS_DIR}' \
   DIRECTUS_PORT='${DIRECTUS_PORT}' \
   DIRECTUS_SECRET='${DIRECTUS_SECRET}' \
   DIRECTUS_ADMIN_EMAIL='${DIRECTUS_ADMIN_EMAIL}' \
   DIRECTUS_ADMIN_PASSWORD='${DIRECTUS_ADMIN_PASSWORD}' \
   SKIP_CERTBOT='${SKIP_CERTBOT}' \
   DEPLOY_USER='${VPS_USER}' \
   bash -s" <<'REMOTE'
set -euo pipefail

# ── Docker ──────────────────────────────────────────────────────────────────
if ! command -v docker >/dev/null 2>&1; then
  echo "→ Устанавливаю Docker..."
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$DEPLOY_USER"
  echo "   Docker установлен. Группа docker добавлена — продолжаем через sudo."
else
  echo "→ Docker уже установлен: $(docker --version)"
fi

if ! command -v docker >/dev/null 2>&1 && ! sudo docker version >/dev/null 2>&1; then
  echo "Ошибка: Docker не запустился." >&2
  exit 1
fi

DOCKER="docker"
if ! $DOCKER version >/dev/null 2>&1; then
  DOCKER="sudo docker"
fi

# ── Директория Directus ──────────────────────────────────────────────────────
echo "→ Создаю директорию ${DIRECTUS_DIR}..."
sudo mkdir -p "${DIRECTUS_DIR}/database" "${DIRECTUS_DIR}/uploads" "${DIRECTUS_DIR}/extensions"
sudo chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${DIRECTUS_DIR}"

# ── docker-compose.yml ───────────────────────────────────────────────────────
echo "→ Создаю docker-compose.yml..."
cat > "${DIRECTUS_DIR}/docker-compose.yml" <<COMPOSE
services:
  directus:
    image: directus/directus:latest
    container_name: directus
    restart: unless-stopped
    ports:
      - "127.0.0.1:${DIRECTUS_PORT}:8055"
    volumes:
      - ${DIRECTUS_DIR}/database:/directus/database
      - ${DIRECTUS_DIR}/uploads:/directus/uploads
      - ${DIRECTUS_DIR}/extensions:/directus/extensions
    environment:
      SECRET: "${DIRECTUS_SECRET}"
      DB_CLIENT: "sqlite3"
      DB_FILENAME: "/directus/database/data.db"
      ADMIN_EMAIL: "${DIRECTUS_ADMIN_EMAIL}"
      ADMIN_PASSWORD: "${DIRECTUS_ADMIN_PASSWORD}"
      PUBLIC_URL: "https://${ADMIN_DOMAIN}"
      CORS_ENABLED: "true"
      CORS_ORIGIN: "https://rybasvprud.ru"
      CACHE_ENABLED: "false"
COMPOSE

# ── Запуск Directus ──────────────────────────────────────────────────────────
echo "→ Запускаю Directus..."
cd "${DIRECTUS_DIR}"
$DOCKER compose up -d

echo "→ Жду запуска Directus (до 60 сек)..."
for i in $(seq 1 12); do
  if curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${DIRECTUS_PORT}/server/health" | grep -q "200"; then
    echo "   Directus запущен!"
    break
  fi
  echo "   Попытка $i/12..."
  sleep 5
done

# ── nginx: поддомен admin ────────────────────────────────────────────────────
echo "→ Настраиваю nginx для ${ADMIN_DOMAIN}..."

sudo tee "/etc/nginx/sites-available/${ADMIN_DOMAIN}" >/dev/null <<NGINX
server {
  listen 80;
  listen [::]:80;
  server_name ${ADMIN_DOMAIN};

  client_max_body_size 100M;

  location / {
    proxy_pass http://127.0.0.1:${DIRECTUS_PORT};
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 300s;
  }
}
NGINX

sudo ln -sfn "/etc/nginx/sites-available/${ADMIN_DOMAIN}" "/etc/nginx/sites-enabled/${ADMIN_DOMAIN}"
sudo nginx -t
sudo systemctl reload nginx

# ── SSL ──────────────────────────────────────────────────────────────────────
if [[ "$SKIP_CERTBOT" == "1" ]]; then
  echo "SKIP_CERTBOT=1: SSL пропущен. Запустите скрипт снова без SKIP_CERTBOT после настройки DNS."
else
  echo "→ Получаю SSL-сертификат для ${ADMIN_DOMAIN}..."
  if sudo certbot --nginx \
    --non-interactive \
    --agree-tos \
    --redirect \
    -m "$CERTBOT_EMAIL" \
    -d "$ADMIN_DOMAIN"; then
    echo "   SSL выпущен успешно!"
  else
    echo "Предупреждение: certbot не смог выпустить сертификат." >&2
    echo "Проверьте DNS A-запись для ${ADMIN_DOMAIN} -> IP_ВАШЕГО_VPS" >&2
  fi
fi

sudo nginx -t
sudo systemctl reload nginx

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Directus установлен!"
echo "  URL:      https://${ADMIN_DOMAIN}"
echo "  Логин:    ${DIRECTUS_ADMIN_EMAIL}"
echo "  Пароль:   (тот, что вы задали)"
echo "═══════════════════════════════════════════════════"
REMOTE

echo ""
echo "Готово! Открывайте: https://admin.${DOMAIN}"
echo "Логин: ${DIRECTUS_ADMIN_EMAIL}"
