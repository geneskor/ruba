# Руководство по репозиторию

## Структура проекта и организация модулей
Это сайт на Astro + Tailwind.
- `src/pages/` — страницы маршрутов (`index.astro`, `about.astro`, `contacts.astro`, `delivery.astro`, `blog/index.astro`, `blog/[slug].astro`, `catalog/ryba/index.astro`, `catalog/ryba/[category]/index.astro`, `catalog/ryba/[category]/[slug].astro`, `ryba/index.astro`, `ryba/[category]/index.astro`, `ryba/[category]/[slug].astro`, `sitemap.xml.ts`); имя файла соответствует URL.
- `src/components/` — переиспользуемые UI-компоненты.
- `src/layouts/` — общие каркасы страниц (`Layout.astro`, `BaseLayout.astro`).
- `src/data/` — локальные данные (например, `products.json`, `categories.json`, `fish.json`, `catalog/ryba.json`, `blog.json`, `delivery.json`, `product-faq.json`).
- `src/styles/` — глобальные стили (`global.css` подключает Tailwind).
- `src/assets/` — ассеты, которые бандлятся; `public/` — статика как есть (например, `public/favicon.svg`).
- Конфиги: `astro.config.mjs`, `tsconfig.json`; сборка попадает в `dist/`.

## Сборка, тесты и разработка
Команды выполняются из корня репозитория:
- `npm install` — установка зависимостей.
- `npm run dev` — локальный сервер на `http://localhost:4321`.
- `npm run build` — продакшн-сборка в `dist/`.
- `npm run preview` — локальный предпросмотр сборки.
- `npm run astro -- --help` — справка по CLI Astro.

## Стиль кода и именование
- Отступы: 2 пробела в `.astro` файлах.
- Компоненты/лейауты — PascalCase (`Layout.astro`, `Welcome.astro`); страницы — lower-case по URL (`catalog.astro`).
- Стилизацию держите в Tailwind-классах; глобальные правки — в `src/styles/global.css`.
- Форматтер и линтер не настроены — следуйте стилю соседнего кода.

## Тестирование
- Фреймворк и скрипты тестов пока отсутствуют.
- При добавлении тестов укажите выбранный фреймворк, команды запуска и схему именования (например, `*.test.ts`).

## Коммиты и pull request
- Конвенция коммитов не задана (в истории только scaffold).
- Используйте короткие повелительные сообщения (например, `Добавить карточки каталога`).
- PR должен содержать: описание, ссылку на задачу (если есть) и шаги проверки.
- Для UI-изменений приложите скриншоты «до/после».

## Требования к взаимодействию и актуальности
- Все ответы и обсуждения ведите на русском языке.
- Актуализируйте этот документ по мере развития проекта (новые команды, структура, правила).
