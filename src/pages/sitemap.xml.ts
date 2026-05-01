import { getCatalog, getBlog } from '../lib/directus';

const SITE = import.meta.env.SITE || 'https://rybasvprud.ru';

type SitemapEntry = {
  path: string;
  lastmod?: string;
};

export async function GET() {
  const [ryba, blog] = await Promise.all([getCatalog(), getBlog()]);

  const staticRoutes: SitemapEntry[] = [
    { path: '/' },
    { path: '/contacts/' },
    { path: '/ryba/' },
    { path: '/blog/' },
    { path: '/delivery/' }
  ];

  const categoryRoutes: SitemapEntry[] = ryba.categories.map((category) => ({
    path: `/ryba/${category.slug}/`
  }));

  const productRoutes: SitemapEntry[] = ryba.products.map((product) => ({
    path: `/ryba/${product.category}/${product.slug}/`
  }));

  const blogRoutes: SitemapEntry[] = blog.posts.map((post) => ({
    path: `/blog/${post.slug}/`,
    lastmod: post.date
  }));

  const urls = [...staticRoutes, ...categoryRoutes, ...productRoutes, ...blogRoutes];

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(({ path, lastmod }) => {
        const loc = new URL(path, SITE).toString();
        const lastmodTag = lastmod ? `<lastmod>${lastmod}</lastmod>` : '';
        return `  <url><loc>${loc}</loc>${lastmodTag}</url>`;
      })
      .join('\n') +
    `\n</urlset>`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' }
  });
}
