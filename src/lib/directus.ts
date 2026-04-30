const BASE = (import.meta.env.DIRECTUS_URL ?? 'https://admin.rybasvprud.ru').replace(/\/$/, '');

async function fetchAll<T>(path: string): Promise<T[]> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`Directus error ${res.status}: ${path}`);
  const { data } = (await res.json()) as { data: T[] };
  return data;
}

export interface Category {
  slug: string;
  title: string;
  description: string;
}

export interface PriceRow { volume: string; price: string }
export interface PriceTable { title: string; rows: PriceRow[] }

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  priceFrom?: boolean;
  shortDesc: string;
  description: string;
  image: string;
  priceTables: PriceTable[];
}

export type ContentBlock =
  | string
  | { type: 'h2' | 'h3'; text: string }
  | { type: 'ul' | 'ol'; items: string[] }
  | { type: string; text?: string; items?: string[] };

export interface RelatedLink { href: string; title: string }
export interface PostCta { title: string; description: string }

export interface BlogPost {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  description: string;
  excerpt: string;
  date: string;
  image: string;
  content: ContentBlock[];
  relatedLinks?: RelatedLink[];
  cta?: PostCta;
}

export interface Catalog {
  title: string;
  slug: string;
  description: string;
  categories: Category[];
  products: Product[];
}

export interface Blog {
  posts: BlogPost[];
}

let _catalog: Catalog | null = null;
let _blog: Blog | null = null;

export async function getCatalog(): Promise<Catalog> {
  if (_catalog) return _catalog;

  const [rawCats, rawProds] = await Promise.all([
    fetchAll<Record<string, unknown>>('/items/categories?sort=id&limit=-1'),
    fetchAll<Record<string, unknown>>('/items/products?sort=id&limit=-1'),
  ]);

  _catalog = {
    title: 'Рыба для пруда',
    slug: 'ryba',
    description: 'Каталог рыбы для зарыбления, платной рыбалки и декоративных прудов.',
    categories: rawCats.map((c) => ({
      slug: c.slug as string,
      title: c.title as string,
      description: (c.description ?? '') as string,
    })),
    products: rawProds.map((p) => ({
      id: p.slug as string,
      slug: p.slug as string,
      name: p.name as string,
      category: p.category as string,
      unit: (p.unit ?? '') as string,
      price: (p.price ?? 0) as number,
      priceFrom: (p.price_from ?? false) as boolean,
      shortDesc: (p.short_desc ?? '') as string,
      description: (p.description ?? '') as string,
      image: (p.image ?? '') as string,
      priceTables: (p.price_tables ?? []) as PriceTable[],
    })),
  };

  return _catalog;
}

export async function getBlog(): Promise<Blog> {
  if (_blog) return _blog;

  const rawPosts = await fetchAll<Record<string, unknown>>('/items/blog_posts?sort=id&limit=-1');

  _blog = {
    posts: rawPosts.map((p) => ({
      slug: p.slug as string,
      title: p.title as string,
      metaTitle: (p.meta_title ?? '') as string,
      metaDescription: (p.meta_description ?? '') as string,
      description: (p.description ?? '') as string,
      excerpt: (p.excerpt ?? '') as string,
      date: (p.date ?? '') as string,
      image: (p.image ?? '') as string,
      content: (p.content ?? []) as unknown[],
    })),
  };

  return _blog;
}
