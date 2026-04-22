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
  const categorySet = new Set(data.categories.map((item) => item.slug));

  let updated = 0;
  let created = 0;
  let skipped = 0;
  const warnings = [];

  for (const record of records) {
    const slugCell = readCell(record, ['slug']);
    const idCell = readCell(record, ['id']);
    const slug = String(slugCell || idCell || '').trim();
    const id = String(idCell || slugCell || '').trim();

    if (!slug && !id) {
      skipped += 1;
      warnings.push('пропуск строки: отсутствуют slug и id');
      continue;
    }

    const product = (slug && bySlug.get(slug)) || (id && byId.get(id));
    if (!product) {
      const context = `новый товар ${slug}`;
      const name = readCell(record, ['name', 'title', 'название']);
      const category = readCell(record, ['category', 'category_slug']);
      const priceRaw = readCell(record, ['price']);

      if (!slug) {
        skipped += 1;
        warnings.push(`пропуск строки id="${id}": нужен slug`);
        continue;
      }

      if (!name || !category || priceRaw === undefined || priceRaw === '') {
        skipped += 1;
        warnings.push(`${context}: нужны обязательные поля slug, name, category, price`);
        continue;
      }

      if (!categorySet.has(category)) {
        skipped += 1;
        warnings.push(`${context}: категория "${category}" не найдена в categories`);
        continue;
      }

      const newId = id || slug;
      if (bySlug.has(slug) || byId.has(newId)) {
        skipped += 1;
        warnings.push(`${context}: дублирующийся slug/id`);
        continue;
      }

      const createdProduct = {
        id: newId,
        slug,
        name,
        category
      };

      try {
        applyNumberField(createdProduct, 'price', priceRaw, context);
      } catch (error) {
        skipped += 1;
        warnings.push(error.message);
        continue;
      }

      applyTextField(createdProduct, 'priceFrom', readCell(record, ['pricefrom', 'price_from', 'price_from_text']));
      if (!createdProduct.priceFrom && createdProduct.price !== undefined) {
        createdProduct.priceFrom = `от ${createdProduct.price} руб.`;
      }

      applyTextField(createdProduct, 'unit', readCell(record, ['unit']));
      if (!createdProduct.unit) {
        createdProduct.unit = 'шт';
      }

      applyTextField(createdProduct, 'shortDesc', readCell(record, ['shortdesc', 'short_desc']));
      applyTextField(createdProduct, 'description', readCell(record, ['description']));
      if (!createdProduct.shortDesc && createdProduct.description) {
        createdProduct.shortDesc = createdProduct.description
          .split('\n')
          .map((line) => line.trim())
          .find(Boolean);
      }
      if (!createdProduct.shortDesc) {
        createdProduct.shortDesc = `${createdProduct.name} для зарыбления пруда.`;
      }
      applyTextField(createdProduct, 'image', readCell(record, ['image']));

      const priceTablesJson = readCell(record, ['pricetables_json', 'price_tables_json']);
      if (priceTablesJson) {
        try {
          const parsed = JSON.parse(priceTablesJson);
          if (!Array.isArray(parsed)) {
            throw new Error('ожидается массив');
          }
          createdProduct.priceTables = parsed;
        } catch (error) {
          skipped += 1;
          warnings.push(`${context}: pricetables_json невалидный JSON (${error.message})`);
          continue;
        }
      }

      data.products.push(createdProduct);
      bySlug.set(createdProduct.slug, createdProduct);
      byId.set(createdProduct.id, createdProduct);
      created += 1;
      continue;
    }

    const previousSlug = product.slug;
    const previousId = product.id;
    const context = `товар ${product.slug}`;

    if (slug && slug !== product.slug && bySlug.has(slug)) {
      skipped += 1;
      warnings.push(`${context}: slug "${slug}" уже используется`);
      continue;
    }

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

    if (!categorySet.has(product.category)) {
      throw new Error(`${context}: категория "${product.category}" не найдена в categories`);
    }

    if (!product.id) {
      product.id = product.slug;
    }

    if (product.slug !== previousSlug) {
      bySlug.delete(previousSlug);
      bySlug.set(product.slug, product);
    }

    if (product.id !== previousId) {
      byId.delete(previousId);
      byId.set(product.id, product);
    }

    updated += 1;
  }

  if (warnings.length) {
    console.warn(`Google Sheets sync: products warnings=${warnings.length}`);
    warnings.slice(0, 20).forEach((message) => console.warn(` - ${message}`));
    if (warnings.length > 20) {
      console.warn(` - ... и еще ${warnings.length - 20} предупреждений`);
    }
  }

  return { updated, created, skipped };
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
    stats.push(`products: rows=${records.length}, updated=${result.updated}, created=${result.created}, skipped=${result.skipped}`);
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
