#!/usr/bin/env node
import { readFileSync } from 'fs';

const BASE_URL = process.env.DIRECTUS_URL || 'http://45.10.244.233:8055';
const EMAIL = process.env.DIRECTUS_EMAIL || 'skorn.evgeny@gmail.com';
const PASSWORD = process.env.DIRECTUS_PASSWORD || 'Sf858kYSw3NbW2MOxqHFQ';

async function login() {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const { data } = await res.json();
  return data.access_token;
}

async function post(token, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function main() {
  const token = await login();
  console.log('Авторизация успешна');

  const ryba = JSON.parse(readFileSync('src/data/catalog/ryba.json', 'utf8'));
  const blog = JSON.parse(readFileSync('src/data/blog.json', 'utf8'));

  // Импорт категорий
  console.log(`\nИмпорт категорий (${ryba.categories.length})...`);
  for (const cat of ryba.categories) {
    const res = await post(token, '/items/categories', {
      slug: cat.slug,
      title: cat.title,
      description: cat.description,
    });
    if (res.errors) {
      console.error(`  Ошибка категория ${cat.slug}:`, res.errors[0].message);
    } else {
      console.log(`  ✓ ${cat.title}`);
    }
  }

  // Импорт товаров
  console.log(`\nИмпорт товаров (${ryba.products.length})...`);
  for (const p of ryba.products) {
    const res = await post(token, '/items/products', {
      slug: p.slug,
      name: p.name,
      category: p.category,
      unit: p.unit,
      price: p.price,
      short_desc: p.shortDesc,
      description: p.description,
      image: p.image,
      price_tables: p.priceTables,
    });
    if (res.errors) {
      console.error(`  Ошибка товар ${p.slug}:`, res.errors[0].message);
    } else {
      console.log(`  ✓ ${p.name}`);
    }
  }

  // Импорт статей блога
  console.log(`\nИмпорт статей блога (${blog.posts.length})...`);
  for (const post of blog.posts) {
    const res = await fetch(`${BASE_URL}/items/blog_posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        slug: post.slug,
        title: post.title,
        meta_title: post.metaTitle,
        meta_description: post.metaDescription,
        description: post.description,
        excerpt: post.excerpt,
        date: post.date,
        image: post.image,
        content: post.content,
      }),
    }).then(r => r.json());
    if (res.errors) {
      console.error(`  Ошибка статья ${post.slug}:`, res.errors[0].message);
    } else {
      console.log(`  ✓ ${post.title}`);
    }
  }

  console.log('\nИмпорт завершён!');
}

main().catch(console.error);
