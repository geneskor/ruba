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

if ! command -v curl >/dev/null 2>&1; then
  echo "Ошибка: curl не найден." >&2
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

echo "Загрузка $total_files файлов -> ${HOSTING_PROTOCOL}://${HOSTING_HOST}/${HOSTING_REMOTE_DIR}/"

# Шаг 1: удалить все существующие файлы на сервере через lftp
if command -v lftp >/dev/null 2>&1; then
  lftp_ssl_force="false"
  if [[ "$HOSTING_PROTOCOL" == "ftps" ]]; then
    lftp_ssl_force="true"
  fi
  echo "Очистка удалённой директории..."
  lftp -u "$HOSTING_USER","$HOSTING_PASSWORD" "${HOSTING_PROTOCOL}://${HOSTING_HOST}" -e "\
    set ftp:passive-mode true; \
    set ftp:ssl-force ${lftp_ssl_force}; \
    set net:max-retries 3; \
    set net:timeout 20; \
    glob -a rm -r ${HOSTING_REMOTE_DIR}/*; \
    bye" 2>/dev/null || true
  echo "Очистка завершена."
fi

# Шаг 2: загрузить все файлы заново через curl (безусловно)
cd "$BUILD_DIR"

count=0
while IFS= read -r file_path; do
  rel_path="${file_path#./}"
  target_url="${HOSTING_PROTOCOL}://${HOSTING_HOST}/${HOSTING_REMOTE_DIR}/${rel_path}"

  curl_common_args=(
    --silent
    --show-error
    --fail
    --ftp-create-dirs
    --connect-timeout 20
    --max-time 180
    --retry 5
    --retry-delay 2
    --retry-all-errors
    --user "${HOSTING_USER}:${HOSTING_PASSWORD}"
    -T "$file_path"
    "$target_url"
  )

  if [[ "$HOSTING_PROTOCOL" == "ftps" ]]; then
    curl --ssl-reqd "${curl_common_args[@]}" >/dev/null
  else
    curl "${curl_common_args[@]}" >/dev/null
  fi

  count=$((count + 1))
  if (( count % 25 == 0 )) || (( count == total_files )); then
    echo "Загружено: ${count}/${total_files}"
  fi
done < <(find . -type f | sort)

echo "Деплой завершен: https://rybasvprud.ru"
