import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const inputPath = path.join(projectRoot, 'src/data/catalog/ryba.json');
const outputDir = path.join(projectRoot, 'docs/google-sheets');
const productsCsvPath = path.join(outputDir, 'products.csv');
const categoriesCsvPath = path.join(outputDir, 'categories.csv');

const escapeCsv = (value) => {
  const text = value === undefined || value === null ? '' : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const toCsv = (headers, rows) => {
  const lines = [];
  lines.push(headers.map(escapeCsv).join(','));
  for (const row of rows) {
    lines.push(headers.map((header) => escapeCsv(row[header])).join(','));
  }
  return `${lines.join('\n')}\n`;
};

const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
fs.mkdirSync(outputDir, { recursive: true });

const productHeaders = [
  'slug',
  'id',
  'name',
  'category',
  'pricefrom',
  'price',
  'unit',
  'shortdesc',
  'description',
  'image',
  'pricetables_json'
];

const productRows = (data.products || []).map((product) => ({
  slug: product.slug || '',
  id: product.id || '',
  name: product.name || '',
  category: product.category || '',
  pricefrom: product.priceFrom || '',
  price: product.price ?? '',
  unit: product.unit || '',
  shortdesc: product.shortDesc || '',
  description: product.description || '',
  image: product.image || '',
  pricetables_json: Array.isArray(product.priceTables) ? JSON.stringify(product.priceTables) : ''
}));

const categoryHeaders = ['slug', 'title', 'description'];
const categoryRows = (data.categories || []).map((category) => ({
  slug: category.slug || '',
  title: category.title || '',
  description: category.description || ''
}));

fs.writeFileSync(productsCsvPath, toCsv(productHeaders, productRows));
fs.writeFileSync(categoriesCsvPath, toCsv(categoryHeaders, categoryRows));

console.log(`CSV exported:`);
console.log(`- ${path.relative(projectRoot, productsCsvPath)}`);
console.log(`- ${path.relative(projectRoot, categoriesCsvPath)}`);

