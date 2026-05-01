# Деплой на VPS (доступно из РФ)

Этот проект уже подготовлен для выкладки статики Astro на VPS с `nginx + Let's Encrypt`.

## 1. Что нужно заранее

- VPS на Ubuntu/Debian в РФ.
- SSH-доступ на сервер (`VPS_HOST`, `VPS_USER`).
- Домен в Nethouse: `rybasvprud.ru`.
- Email для Let's Encrypt (`CERTBOT_EMAIL`).

## 2. DNS в Nethouse

В `domains.nethouse.ru` создайте/обновите записи:

1. `A` для `@` -> `IP_ВАШЕГО_VPS`
2. `A` для `www` -> `IP_ВАШЕГО_VPS`

Рекомендуемый TTL на время миграции: `300`.

## 3. Одноразовая настройка сервера

Из корня репозитория:

```bash
export VPS_HOST=<ip_или_hostname>
export VPS_USER=<ssh_user>
export CERTBOT_EMAIL=<email>

# Опционально
export VPS_SSH_PORT=22
export DOMAIN=rybasvprud.ru
export WWW_DOMAIN=www.rybasvprud.ru
export WEB_ROOT=/var/www/rybasvprud.ru
export SKIP_CERTBOT=1  # если DNS еще не указывает на VPS

npm run setup:vps
```

Скрипт:
- ставит `nginx`, `certbot`, `python3-certbot-nginx`, `rsync`;
- создает веб-каталог;
- применяет конфиг `nginx`;
- выпускает SSL и включает редирект HTTP -> HTTPS.

Если запускали с `SKIP_CERTBOT=1`, после переключения DNS выполните `npm run setup:vps` еще раз без `SKIP_CERTBOT`, чтобы получить SSL.

## 4. Деплой сайта

```bash
export VPS_HOST=<ip_или_hostname>
export VPS_USER=<ssh_user>

# Опционально
export VPS_SSH_PORT=22
export DOMAIN=rybasvprud.ru
export WEB_ROOT=/var/www/rybasvprud.ru

npm run deploy:vps
```

Скрипт:
- выполняет `npm ci` и `npm run build`;
- синхронизирует `dist/` на сервер через `rsync --delete`;
- проверяет и перезагружает `nginx`.

## 5. Проверка после переключения

```bash
npm run check:domain
```

Проверяются DNS у `1.1.1.1` и `8.8.8.8`, а также статусы `http/https` для `apex` и `www`.

## 6. Повторные релизы

Для следующих выкладок достаточно:

```bash
npm run deploy:vps
```

Если зависимости уже стоят и `dist` уже собран:

```bash
SKIP_INSTALL=1 SKIP_BUILD=1 npm run deploy:vps
```
