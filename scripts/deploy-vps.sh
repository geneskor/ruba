#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

VPS_HOST="${VPS_HOST:-}"
VPS_USER="${VPS_USER:-}"
VPS_SSH_PORT="${VPS_SSH_PORT:-22}"
DOMAIN="${DOMAIN:-rybasvprud.ru}"
WEB_ROOT="${WEB_ROOT:-/var/www/${DOMAIN}}"
BUILD_DIR="${BUILD_DIR:-dist}"

if [[ -z "$VPS_HOST" || -z "$VPS_USER" ]]; then
  cat <<USAGE
Ошибка: не заданы обязательные переменные.

Нужно перед запуском:
  export VPS_HOST=<ip_или_hostname>
  export VPS_USER=<ssh_user>

Опционально:
  export VPS_SSH_PORT=22
  export DOMAIN=rybasvprud.ru
  export WEB_ROOT=/var/www/rybasvprud.ru
  export BUILD_DIR=dist
  export SKIP_INSTALL=1   # если зависимости уже установлены
  export SKIP_BUILD=1     # если dist уже собран
USAGE
  exit 1
fi

if ! command -v rsync >/dev/null 2>&1; then
  echo "Ошибка: rsync не найден." >&2
  exit 1
fi

if ! command -v ssh >/dev/null 2>&1; then
  echo "Ошибка: ssh не найден." >&2
  exit 1
fi

cd "$ROOT_DIR"

if [[ "${SKIP_BUILD:-0}" != "1" ]]; then
  if [[ "${SKIP_INSTALL:-0}" != "1" ]]; then
    npm ci
  fi
  npm run build
fi

if [[ ! -d "$BUILD_DIR" ]]; then
  echo "Ошибка: директория сборки '$BUILD_DIR' не найдена." >&2
  exit 1
fi

echo "Загрузка $BUILD_DIR -> ${VPS_USER}@${VPS_HOST}:${WEB_ROOT}/"
rsync -avz --delete \
  -e "ssh -p ${VPS_SSH_PORT}" \
  "$BUILD_DIR/" "${VPS_USER}@${VPS_HOST}:${WEB_ROOT}/"

echo "Проверка nginx на сервере"
ssh -t -p "$VPS_SSH_PORT" "${VPS_USER}@${VPS_HOST}" "sudo nginx -t && sudo systemctl reload nginx"

echo "Деплой завершен: https://${DOMAIN}"
