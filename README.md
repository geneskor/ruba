# ryba-site

Сайт на `Astro + Tailwind`.

## Команды

```bash
npm install
npm run dev
npm run build
npm run preview
npm run astro -- --help
```

Дополнительно:

```bash
npm run optimize:videos
npm run sheet:export
npm run sync:sheet
npm run setup:vps
npm run deploy:vps
npm run deploy:hosting
npm run check:domain
```

## Деплой

Прод-выкладка вынесена на VPS (без Netlify), чтобы сайт был стабильно доступен из РФ.

Подробная инструкция: [DEPLOY_VPS.md](./DEPLOY_VPS.md)

## Важные файлы

- `astro.config.mjs` — общая конфигурация Astro (`site` выставлен на `https://rybasvprud.ru`).
- `scripts/setup-vps.sh` — первичная настройка сервера (nginx + certbot).
- `scripts/deploy-vps.sh` — сборка и публикация `dist/` на VPS.
- `scripts/deploy-hosting.sh` — сборка и публикация `dist/` на обычный хостинг (FTP/FTPS).
- `scripts/check-domain.sh` — проверка DNS/HTTP/HTTPS после миграции.

## Вариант без CMS: Google Sheets -> JSON

Если хотите редактировать названия и цены без VPS и OAuth, можно синхронизировать каталог из Google Sheets.

### 1. Сгенерируйте готовые CSV из текущего каталога

```bash
npm run sheet:export
```

Будут созданы файлы:

- `docs/google-sheets/products.csv`
- `docs/google-sheets/categories.csv`

### 2. Создайте Google таблицу и импортируйте CSV

Сделайте два листа:

- `products` (импорт `products.csv`)
- `categories` (импорт `categories.csv`, опционально)

Колонки `products`:

- `slug` (или `id`) — ключ для поиска товара в `src/data/catalog/ryba.json`
- `name`
- `pricefrom` (например `от 500 руб.`)
- `price` (число)
- `unit`
- `shortdesc`
- `description`
- `image`
- `category`
- `pricetables_json` (опционально, JSON-массив таблиц цен)

Колонки `categories`:

- `slug`
- `title`
- `description`

### 3. Опубликуйте листы как CSV и задайте переменные окружения

```bash
cat > .env <<'EOF'
GOOGLE_SHEETS_RYBA_PRODUCTS_CSV_URL="https://docs.google.com/spreadsheets/d/e/.../pub?gid=0&single=true&output=csv"
GOOGLE_SHEETS_RYBA_CATEGORIES_CSV_URL="https://docs.google.com/spreadsheets/d/e/.../pub?gid=123&single=true&output=csv" # опционально
EOF
```

### 4. Синхронизация и сборка

```bash
npm run sync:sheet
npm run build
```

Если переменные не заданы, синхронизация пропускается автоматически.

### 5. Автодеплой после правок в Google Sheets (GitHub Actions + Apps Script)

В репозитории есть workflow: `.github/workflows/deploy-from-sheets.yml`.

1. Добавьте в GitHub Actions secrets:
   - `GOOGLE_SHEETS_RYBA_PRODUCTS_CSV_URL`
   - `GOOGLE_SHEETS_RYBA_CATEGORIES_CSV_URL` (опционально)
   - `HOSTING_HOST`
   - `HOSTING_USER`
   - `HOSTING_PASSWORD`
   - `HOSTING_REMOTE_DIR` (`public_html`)
   - `HOSTING_PROTOCOL` (`ftp` или `ftps`, опционально)
2. Проверьте ручной запуск workflow `Deploy From Sheets` (кнопка `Run workflow`).
3. В Google Sheets создайте Apps Script и установите installable trigger `On edit` для функции `onEditInstallable`.

```javascript
function onEditInstallable(e) {
  const sheetName = e.range.getSheet().getName();
  if (!['products', 'categories'].includes(sheetName)) return;

  const props = PropertiesService.getScriptProperties();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;

  try {
    const now = Date.now();
    const last = Number(props.getProperty('LAST_DISPATCH_TS') || 0);
    if (now - last < 60000) return; // антиспам: не чаще 1 раза в минуту

    const owner = props.getProperty('GITHUB_OWNER');
    const repo = props.getProperty('GITHUB_REPO');
    const token = props.getProperty('GITHUB_TOKEN');

    const response = UrlFetchApp.fetch(
      `https://api.github.com/repos/${owner}/${repo}/dispatches`,
      {
        method: 'post',
        contentType: 'application/json',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        },
        payload: JSON.stringify({ event_type: 'sheets_updated' }),
        muteHttpExceptions: true,
      }
    );

    if (response.getResponseCode() >= 300) {
      throw new Error(`GitHub dispatch failed: ${response.getContentText()}`);
    }

    props.setProperty('LAST_DISPATCH_TS', String(now));
  } finally {
    lock.releaseLock();
  }
}
```

4. В Script Properties задайте:
   - `GITHUB_OWNER`
   - `GITHUB_REPO`
   - `GITHUB_TOKEN` (PAT с доступом к репозиторию).

### SEO

На SEO это не влияет негативно, потому что данные подтягиваются **до сборки**, а сайт остается статическим (`Astro build`).
