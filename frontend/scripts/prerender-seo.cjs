const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

const API_BASE = (process.env.REACT_APP_API_BASE_URL || 'https://garageboy-api.vercel.app').replace(/\/$/, '');
const CANONICAL_ORIGIN = 'https://www.garageboy.id';
const DEFAULT_IMAGE = `${CANONICAL_ORIGIN}/garageboy-logo.png`;
const BUILD_DIR = path.join(__dirname, '..', 'build');

function slug(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'item';
}

const encodeId = (value) => encodeURIComponent(String(value || ''));
const productPath = (product) => `/products/${slug(product.slug || product.name)}/${encodeId(product.id)}`;
const brandPath = (product) => `/brands/${slug(product.brandSlug || product.brandLabel)}/${encodeId(product.brand_id)}`;
const categoryPath = (product) => `/categories/${slug(product.modLabel)}/${encodeId(product.category_id)}`;
const modelPath = (product) => `/vehicles/${slug(product.brandSlug || product.brandLabel)}/${slug(product.seriesLabel)}/${encodeId(product.vehicle_model_id)}`;
const generationPath = (product) => `${modelPath(product)}/${slug(product.modelLabel)}/${encodeId(product.vehicle_generation_id)}`;

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

function escapeJsonForScript(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

function vehicleLabel(product, includeGeneration = true) {
  const values = [product.brandLabel, product.seriesLabel, includeGeneration ? product.modelLabel : ''];
  const seen = new Set();
  return values
    .map((value) => String(value || '').trim())
    .filter((value) => {
      const key = value.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(' ');
}

function compactDescription(value) {
  const text = String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length <= 160) return text;
  return `${text.slice(0, 157).replace(/\s+\S*$/, '')}...`;
}

function imageFor(product) {
  const ordered = [...(product.images || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const image = product.img || ordered.find((item) => item.url)?.url;
  if (!image) return DEFAULT_IMAGE;
  try {
    const parsed = new URL(image, `${CANONICAL_ORIGIN}/`);
    if (parsed.origin === CANONICAL_ORIGIN) {
      const decodedPath = decodeURIComponent(parsed.pathname);
      const assetPath = path.resolve(BUILD_DIR, `.${decodedPath}`);
      if (!assetPath.startsWith(`${BUILD_DIR}${path.sep}`) || !fs.existsSync(assetPath)) return DEFAULT_IMAGE;
    }
    return parsed.href;
  } catch { return DEFAULT_IMAGE; }
}

function baseGraph() {
  return [
    {
      '@type': 'Organization',
      '@id': `${CANONICAL_ORIGIN}/#organization`,
      name: 'GarageBoy',
      url: `${CANONICAL_ORIGIN}/`,
      logo: DEFAULT_IMAGE,
      sameAs: ['https://www.instagram.com/garageboy.id/', 'https://www.tiktok.com/@garageboy.id'],
    },
    {
      '@type': 'WebSite',
      '@id': `${CANONICAL_ORIGIN}/#website`,
      url: `${CANONICAL_ORIGIN}/`,
      name: 'GarageBoy',
      publisher: { '@id': `${CANONICAL_ORIGIN}/#organization` },
    },
  ];
}

function breadcrumb(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem', position: index + 1, name: item.name, item: item.url,
    })),
  };
}

function itemList(products) {
  return {
    '@type': 'ItemList',
    itemListElement: products.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: product.name,
      url: `${CANONICAL_ORIGIN}${productPath(product)}`,
    })),
  };
}

function productSchema(product, url) {
  const schema = { '@type': 'Product', name: product.name, url };
  if (product.description) schema.description = String(product.description).replace(/<[^>]*>/g, ' ').trim();
  const image = imageFor(product);
  if (image !== DEFAULT_IMAGE) schema.image = [image];
  if (product.sku) schema.sku = String(product.sku);
  if (product.brandLabel) schema.brand = { '@type': 'Brand', name: product.brandLabel };
  return schema;
}

function pageFor(pathname, title, description, products, options = {}) {
  const canonical = `${CANONICAL_ORIGIN}${pathname}`;
  const primary = products[0];
  const image = options.image || (primary ? imageFor(primary) : DEFAULT_IMAGE);
  const imageAlt = options.imageAlt || (image === DEFAULT_IMAGE ? 'GarageBoy logo' : primary?.images?.find((item) => item.url)?.alt_text || primary?.name || 'GarageBoy automotive body kit catalog');
  const graph = baseGraph();
  const crumbs = options.breadcrumbs || [];
  if (crumbs.length) graph.push(breadcrumb(crumbs));
  if (options.product) graph.push(productSchema(options.product, canonical));
  else if (products.length) graph.push(itemList(products));

  return {
    path: pathname,
    title,
    description: compactDescription(description),
    canonical,
    robots: 'index,follow',
    image,
    imageAlt,
    type: options.product ? 'product' : 'website',
    jsonLd: { '@context': 'https://schema.org', '@graph': graph },
    fallback: options.fallback || '',
  };
}

function noscriptContent(page, products) {
  const items = products.slice(0, 250).map((product) => (
    `<li><a href="${escapeHtml(productPath(product))}">${escapeHtml(product.name)}</a></li>`
  )).join('');
  const image = page.image ? `<img src="${escapeHtml(page.image)}" alt="${escapeHtml(page.imageAlt)}" />` : '';
  return `<main><h1>${escapeHtml(page.title.replace(/\s*\|\s*GarageBoy$/, ''))}</h1><p>${escapeHtml(page.description)}</p>${image}${items ? `<ul>${items}</ul>` : ''}</main>`;
}

function setTag(html, tagName, id, attributes) {
  const pattern = new RegExp(`<${tagName}\\b(?=[^>]*\\bid="${id}")[^>]*>`);
  return html.replace(pattern, `<${tagName} id="${id}" ${attributes}>`);
}

function htmlForPage(template, page, products) {
  let html = template.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(page.title)}</title>`);
  html = setTag(html, 'meta', 'seo-description', `name="description" content="${escapeHtml(page.description)}"`);
  html = setTag(html, 'meta', 'seo-robots', `name="robots" content="${escapeHtml(page.robots)}"`);
  html = setTag(html, 'link', 'seo-canonical', `rel="canonical" href="${escapeHtml(page.canonical)}"`);
  html = setTag(html, 'meta', 'seo-og-title', `property="og:title" content="${escapeHtml(page.title)}"`);
  html = setTag(html, 'meta', 'seo-og-description', `property="og:description" content="${escapeHtml(page.description)}"`);
  html = setTag(html, 'meta', 'seo-og-type', `property="og:type" content="${page.type}"`);
  html = setTag(html, 'meta', 'seo-og-url', `property="og:url" content="${escapeHtml(page.canonical)}"`);
  html = setTag(html, 'meta', 'seo-og-image', `property="og:image" content="${escapeHtml(page.image)}"`);
  html = setTag(html, 'meta', 'seo-og-image-alt', `property="og:image:alt" content="${escapeHtml(page.imageAlt)}"`);
  html = setTag(html, 'meta', 'seo-og-site-name', 'property="og:site_name" content="GarageBoy"');
  html = setTag(html, 'meta', 'seo-twitter-card', `name="twitter:card" content="${page.image ? 'summary_large_image' : 'summary'}"`);
  html = setTag(html, 'meta', 'seo-twitter-title', `name="twitter:title" content="${escapeHtml(page.title)}"`);
  html = setTag(html, 'meta', 'seo-twitter-description', `name="twitter:description" content="${escapeHtml(page.description)}"`);
  html = setTag(html, 'meta', 'seo-twitter-image', `name="twitter:image" content="${escapeHtml(page.image)}"`);
  html = html.replace(
    /<script id="garageboy-structured-data" type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script id="garageboy-structured-data" type="application/ld+json">${escapeJsonForScript(page.jsonLd)}</script>`,
  );
  html = html.replace(/<noscript id="seo-fallback">[\s\S]*?<\/noscript>/, `<noscript id="seo-fallback">${noscriptContent(page, products)}</noscript>`);
  return html;
}

async function getProducts() {
  const response = await fetch(`${API_BASE}/api/products`, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`GET /api/products returned HTTP ${response.status}`);
  const payload = await response.json();
  const products = Array.isArray(payload) ? payload : payload?.data;
  if (!Array.isArray(products) || products.length === 0) throw new Error('The production API returned no products.');
  return products.filter((product) => product?.id && product?.published !== false);
}

function collectPages(products) {
  const pages = new Map();
  const add = (page) => pages.set(page.path, page);

  add(pageFor('/catalog', 'Automotive Parts Catalog | GarageBoy', `Browse ${products.length} published GarageBoy products by brand, vehicle model, generation, and category.`, products, {
    breadcrumbs: [{ name: 'Home', url: `${CANONICAL_ORIGIN}/` }, { name: 'Catalog', url: `${CANONICAL_ORIGIN}/catalog` }],
    fallback: products,
  }));

  const brands = new Map();
  const categories = new Map();
  const models = new Map();
  const generations = new Map();
  products.forEach((product) => {
    if (product.brand_id && product.brandLabel) {
      const key = String(product.brand_id);
      if (!brands.has(key)) brands.set(key, []);
      brands.get(key).push(product);
    }
    if (product.category_id && product.modLabel) {
      const key = String(product.category_id);
      if (!categories.has(key)) categories.set(key, []);
      categories.get(key).push(product);
    }
    if (product.brand_id && product.vehicle_model_id && product.seriesLabel) {
      const key = `${product.brand_id}|${product.vehicle_model_id}`;
      if (!models.has(key)) models.set(key, []);
      models.get(key).push(product);
    }
    if (product.brand_id && product.vehicle_model_id && product.vehicle_generation_id && product.modelLabel) {
      const key = `${product.brand_id}|${product.vehicle_model_id}|${product.vehicle_generation_id}`;
      if (!generations.has(key)) generations.set(key, []);
      generations.get(key).push(product);
    }
  });

  for (const rows of brands.values()) {
    const product = rows[0];
    const url = brandPath(product);
    add(pageFor(url, `${product.brandLabel} Body Kits & Automotive Parts | GarageBoy`, `Browse ${rows.length} published GarageBoy catalog products for ${product.brandLabel} vehicles.`, rows, {
      breadcrumbs: [{ name: 'Home', url: `${CANONICAL_ORIGIN}/` }, { name: product.brandLabel, url: `${CANONICAL_ORIGIN}${url}` }],
      fallback: rows,
    }));
  }
  for (const rows of categories.values()) {
    const product = rows[0];
    const url = categoryPath(product);
    add(pageFor(url, `${product.modLabel} | Automotive Parts Catalog | GarageBoy`, `Browse ${rows.length} published products in the ${product.modLabel} category at GarageBoy.`, rows, {
      breadcrumbs: [{ name: 'Home', url: `${CANONICAL_ORIGIN}/` }, { name: product.modLabel, url: `${CANONICAL_ORIGIN}${url}` }],
      fallback: rows,
    }));
  }
  for (const rows of models.values()) {
    const product = rows[0];
    const url = modelPath(product);
    const label = vehicleLabel(product, false);
    add(pageFor(url, `${label} Body Kits & Parts | GarageBoy`, `Browse ${rows.length} published catalog products for ${label} at GarageBoy.`, rows, {
      breadcrumbs: [
        { name: 'Home', url: `${CANONICAL_ORIGIN}/` },
        { name: product.brandLabel, url: `${CANONICAL_ORIGIN}${brandPath(product)}` },
        { name: product.seriesLabel, url: `${CANONICAL_ORIGIN}${url}` },
      ],
      fallback: rows,
    }));
  }
  for (const rows of generations.values()) {
    const product = rows[0];
    const url = generationPath(product);
    const label = vehicleLabel(product);
    add(pageFor(url, `${label} Body Kits & Parts | GarageBoy`, `Browse ${rows.length} published catalog products for ${label} at GarageBoy.`, rows, {
      breadcrumbs: [
        { name: 'Home', url: `${CANONICAL_ORIGIN}/` },
        { name: product.brandLabel, url: `${CANONICAL_ORIGIN}${brandPath(product)}` },
        { name: product.seriesLabel, url: `${CANONICAL_ORIGIN}${modelPath(product)}` },
        { name: product.modelLabel, url: `${CANONICAL_ORIGIN}${url}` },
      ],
      fallback: rows,
    }));
  }
  for (const product of products) {
    const url = productPath(product);
    const vehicle = vehicleLabel(product);
    const suffix = vehicle && !String(product.name || '').toLowerCase().includes(vehicle.toLowerCase()) ? ` · ${vehicle}` : '';
    const title = `${product.name}${suffix} | GarageBoy`;
    const description = product.description || `View the GarageBoy catalog listing for ${product.name}${vehicle ? `, for ${vehicle}` : ''}${product.modLabel ? `, in ${product.modLabel}` : ''}.`;
    const breadcrumbs = [{ name: 'Home', url: `${CANONICAL_ORIGIN}/` }];
    if (product.brandLabel) breadcrumbs.push({ name: product.brandLabel, url: `${CANONICAL_ORIGIN}${brandPath(product)}` });
    breadcrumbs.push({ name: product.name, url: `${CANONICAL_ORIGIN}${url}` });
    add(pageFor(url, title, description, [product], { product, breadcrumbs, fallback: [product] }));
  }
  return [...pages.values()];
}

async function main() {
  const template = await fsp.readFile(path.join(BUILD_DIR, 'index.html'), 'utf8');
  const products = await getProducts();
  if (!products.length) throw new Error('No published products are available for SEO route generation.');
  const pages = collectPages(products);
  let generated = 0;
  for (const page of pages) {
    const routeSegments = page.path.split('/').filter(Boolean);
    const outputDir = path.join(BUILD_DIR, ...routeSegments);
    await fsp.mkdir(outputDir, { recursive: true });
    await fsp.writeFile(path.join(outputDir, 'index.html'), htmlForPage(template, page, page.fallback), 'utf8');
    generated += 1;
  }
  console.log(`Generated ${generated} indexable SEO route documents from ${products.length} published API products.`);
}

main().catch((error) => {
  console.error(`SEO prerender failed: ${error.message}`);
  process.exitCode = 1;
});
