import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const rybaJsonPath = path.join(projectRoot, 'src/data/catalog/ryba.json');

const productsUrl = process.env.GOOGLE_SHEETS_RYBA_PRODUCTS_CSV_URL || '';
const categoriesUrl = process.env.GOOGLE_SHEETS_RYBA_CATEGORIES_CSV_URL || '';

const normalizeHeader = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\uFEFF/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '');

const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      row.push(cell);
      cell = '';
      continue;
    }

    if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    if (char === '\r') {
      continue;
    }

    cell += char;
  }

  row.push(cell);
  rows.push(row);
  return rows.filter((record) => record.some((part) => String(part || '').trim() !== ''));
};

const toRecords = (csvText) => {
  const rows = parseCsv(csvText);
  if (!rows.length) return [];

  const headers = rows[0].map(normalizeHeader);
  const records = [];

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const record = {};
    headers.forEach((header, index) => {
      record[header] = (row[index] || '').trim();
    });
    records.push(record);
  }

  return records;
};

const loadJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const fetchCsv = async (url, label) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${label}: HTTP ${response.status}`);
  }
  return response.text();
};

const readCell = (record, aliases) => {
  for (const alias of aliases) {
    if (record[alias] !== undefined) return record[alias];
  }
  return undefined;
};

const applyTextField = (product, key, value) => {
  if (value === undefined || value === '') return;
  product[key] = value;
};

const applyNumberField = (product, key, value, context) => {
  if (value === undefined || value === '') return;
  const normalized = value.replace(',', '.').replace(/\s+/g, '');
  const numberValue = Number(normalized);
  if (!Number.isFinite(numberValue)) {
    throw new Error(`${context}: "${value}" не является числом`);
  }
  product[key] = numberValue;
};

const syncProducts = (data, records) => {
  const bySlug = new Map(data.products.map((item) => [item.slug, item]));
  const byId = new Map(data.products.map((item) => [item.id, item]));

  let updated = 0;
  let skipped = 0;

  for (const record of records) {
    const slug = readCell(record, ['slug']);
    const id = readCell(record, ['id']);

    if (!slug && !id) {
      skipped += 1;
      continue;
    }

    const product = (slug && bySlug.get(slug)) || (id && byId.get(id));
    if (!product) {
      skipped += 1;
      continue;
    }

    const context = `товар ${product.slug}`;

    applyTextField(product, 'name', readCell(record, ['name', 'title', 'название']));
    applyTextField(product, 'slug', readCell(record, ['slug']));
    applyTextField(product, 'category', readCell(record, ['category', 'category_slug']));
    applyTextField(product, 'priceFrom', readCell(record, ['pricefrom', 'price_from', 'price_from_text']));
    applyNumberField(product, 'price', readCell(record, ['price']), context);
    applyTextField(product, 'unit', readCell(record, ['unit']));
    applyTextField(product, 'shortDesc', readCell(record, ['shortdesc', 'short_desc']));
    applyTextField(product, 'description', readCell(record, ['description']));
    applyTextField(product, 'image', readCell(record, ['image']));

    const priceTablesJson = readCell(record, ['pricetables_json', 'price_tables_json']);
    if (priceTablesJson) {
      try {
        const parsed = JSON.parse(priceTablesJson);
        if (!Array.isArray(parsed)) {
          throw new Error('ожидается массив');
        }
        product.priceTables = parsed;
      } catch (error) {
        throw new Error(`${context}: pricetables_json невалидный JSON (${error.message})`);
      }
    }

    updated += 1;
  }

  return { updated, skipped };
};

const syncCategories = (data, records) => {
  const bySlug = new Map(data.categories.map((item) => [item.slug, item]));
  let updated = 0;
  let skipped = 0;

  for (const record of records) {
    const slug = readCell(record, ['slug']);
    if (!slug) {
      skipped += 1;
      continue;
    }

    const category = bySlug.get(slug);
    if (!category) {
      skipped += 1;
      continue;
    }

    applyTextField(category, 'title', readCell(record, ['title', 'name', 'название']));
    applyTextField(category, 'description', readCell(record, ['description']));
    updated += 1;
  }

  return { updated, skipped };
};

const run = async () => {
  if (!productsUrl && !categoriesUrl) {
    console.log('Google Sheets sync: пропуск (URL не заданы).');
    return;
  }

  const data = loadJson(rybaJsonPath);
  const stats = [];

  if (productsUrl) {
    const csv = await fetchCsv(productsUrl, 'products CSV');
    const records = toRecords(csv);
    const result = syncProducts(data, records);
    stats.push(`products: rows=${records.length}, updated=${result.updated}, skipped=${result.skipped}`);
  }

  if (categoriesUrl) {
    const csv = await fetchCsv(categoriesUrl, 'categories CSV');
    const records = toRecords(csv);
    const result = syncCategories(data, records);
    stats.push(`categories: rows=${records.length}, updated=${result.updated}, skipped=${result.skipped}`);
  }

  fs.writeFileSync(rybaJsonPath, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`Google Sheets sync: OK (${stats.join('; ')})`);
};

run().catch((error) => {
  console.error(`Google Sheets sync: FAIL (${error.message})`);
  process.exit(1);
});

