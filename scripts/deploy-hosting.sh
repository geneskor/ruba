#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

HOSTING_HOST="${HOSTING_HOST:-}"
HOSTING_USER="${HOSTING_USER:-}"
HOSTING_PASSWORD="${HOSTING_PASSWORD:-}"
HOSTING_REMOTE_DIR="${HOSTING_REMOTE_DIR:-public_html}"
HOSTING_PROTOCOL="${HOSTING_PROTOCOL:-ftp}"
BUILD_DIR="${BUILD_DIR:-dist}"

if [[ -z "$HOSTING_HOST" || -z "$HOSTING_USER" || -z "$HOSTING_PASSWORD" ]]; then
  cat <<USAGE
Ошибка: не заданы обязательные переменные.

Нужно перед запуском:
  export HOSTING_HOST=<hostname>
  export HOSTING_USER=<login>
  export HOSTING_PASSWORD=<password>

Опционально:
  export HOSTING_REMOTE_DIR=public_html
  export HOSTING_PROTOCOL=ftp    # ftp или ftps
  export BUILD_DIR=dist
  export SKIP_INSTALL=1          # если зависимости уже установлены
  export SKIP_BUILD=1            # если dist уже собран
USAGE
  exit 1
fi

if [[ "$HOSTING_PROTOCOL" != "ftp" && "$HOSTING_PROTOCOL" != "ftps" ]]; then
  echo "Ошибка: HOSTING_PROTOCOL должен быть ftp или ftps." >&2
  exit 1
fi

if ! command -v lftp >/dev/null 2>&1; then
  echo "Ошибка: lftp не найден." >&2
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

total_files="$(find "$BUILD_DIR" -type f | wc -l | tr -d ' ')"
if [[ "$total_files" == "0" ]]; then
  echo "Ошибка: в '$BUILD_DIR' нет файлов для публикации." >&2
  exit 1
fi

echo "Синхронизация $total_files файлов -> ${HOSTING_PROTOCOL}://${HOSTING_HOST}/${HOSTING_REMOTE_DIR}/"

lftp_ssl_force="false"
if [[ "$HOSTING_PROTOCOL" == "ftps" ]]; then
  lftp_ssl_force="true"
fi

# mirror -R  — загружаем локальное в удалённое
# --transfer-all (-a) — заливаем все файлы, даже если размер совпадает
# --delete (-e)       — удаляем на сервере файлы, которых нет в сборке
# --parallel=4        — 4 параллельных соединения для скорости
lftp -u "$HOSTING_USER","$HOSTING_PASSWORD" "${HOSTING_PROTOCOL}://${HOSTING_HOST}" -e "\
  set ftp:passive-mode true; \
  set ftp:ssl-force ${lftp_ssl_force}; \
  set net:max-retries 3; \
  set net:timeout 30; \
  mirror -R --transfer-all --delete --parallel=4 \
    ${BUILD_DIR}/ ${HOSTING_REMOTE_DIR}/; \
  bye"

echo "Деплой завершен: https://rybasvprud.ru"
