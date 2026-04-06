import ryba from '../data/catalog/ryba.json';
import blog from '../data/blog.json';

const SITE = 'https://example.com';

const staticRoutes = [
  '/',
  '/contacts/',
  '/ryba/',
  '/blog/',
  '/delivery/'
];

const categoryRoutes = [
  ...ryba.categories.map((category) => `/ryba/${category.slug}/`)
];

const productRoutes = [
  ...ryba.products.map(
    (product) => `/ryba/${product.category}/${product.slug}/`
  )
];

const blogRoutes = blog.posts.map((post) => `/blog/${post.slug}/`);

const urls = [...staticRoutes, ...categoryRoutes, ...productRoutes, ...blogRoutes];

const body = `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((path) => `  <url><loc>${new URL(path, SITE).toString()}</loc></url>`).join('\n') +
  `\n</urlset>`;

export function GET() {
  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8'
    }
  });
}
