import {
  CANONICAL_ORIGIN,
  brandPath,
  categoryPath,
  productPath,
  vehicleGenerationPath,
  vehicleModelPath,
} from './seoRoutes';
import {
  productBrandId,
  productBrandLabel,
  productCategoryId,
  productCategoryLabel,
  productGenerationId,
  productGenerationLabel,
  productSeriesId,
  productSeriesLabel,
} from './catalogFilters';

const SITE_NAME = 'GarageBoy';
const DEFAULT_IMAGE = `${CANONICAL_ORIGIN}/garageboy-logo.png`;
const SITE_DESCRIPTION = 'Explore available aftermarket body kits and automotive parts in the GarageBoy catalog. Browse products by brand, vehicle model, generation, and category.';

function cleanText(value) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function limitDescription(value) {
  const text = cleanText(value);
  if (text.length <= 160) return text;
  return `${text.slice(0, 157).replace(/\s+\S*$/, '')}...`;
}

function vehicleLabel(values) {
  const seen = new Set();
  return values
    .map((value) => cleanText(value))
    .filter((value) => {
      const key = value.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(' ');
}

function productImage(product) {
  const orderedImages = Array.isArray(product?.images)
    ? [...product.images].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    : [];
  const source = product?.img || orderedImages.find((image) => image?.url)?.url;
  if (!source) return null;
  try { return new URL(source, `${CANONICAL_ORIGIN}/`).href; } catch { return null; }
}

function filteredProducts(products, filters) {
  return products.filter((product) => (
    (filters.brand === 'all' || String(productBrandId(product)) === String(filters.brand))
    && (filters.series === 'all' || String(productSeriesId(product)) === String(filters.series))
    && (filters.model === 'all' || String(productGenerationId(product)) === String(filters.model))
    && (filters.mod === 'all' || String(productCategoryId(product)) === String(filters.mod))
  ));
}

function makeBreadcrumbs(route, products, canonical) {
  if (route.type === 'home' || route.type === 'admin' || route.type === 'search' || route.type === 'notFound') return [];
  const product = route.type === 'product'
    ? products.find((row) => String(row.id) === String(route.id))
    : products.find((row) => (
      (route.type !== 'brand' || String(productBrandId(row)) === String(route.id))
      && (route.type !== 'category' || String(productCategoryId(row)) === String(route.id))
      && (!route.modelId || String(productSeriesId(row)) === String(route.modelId))
      && (!route.generationId || String(productGenerationId(row)) === String(route.generationId))
    ));
  if (!product) return [];

  const crumbs = [{ name: 'Home', item: `${CANONICAL_ORIGIN}/` }];
  if (route.type === 'category') {
    crumbs.push({ name: productCategoryLabel(product), item: canonical });
  } else if (route.type === 'brand') {
    crumbs.push({ name: productBrandLabel(product), item: canonical });
  } else if (route.type === 'vehicleModel' || route.type === 'vehicleGeneration') {
    crumbs.push({ name: productBrandLabel(product), item: `${CANONICAL_ORIGIN}${brandPath({ id: productBrandId(product), name: productBrandLabel(product), slug: product.brandSlug })}` });
    crumbs.push({ name: productSeriesLabel(product), item: `${CANONICAL_ORIGIN}${vehicleModelPath({ id: productBrandId(product), name: productBrandLabel(product), slug: product.brandSlug }, { id: productSeriesId(product), name: productSeriesLabel(product) })}` });
    if (route.type === 'vehicleGeneration') crumbs.push({ name: productGenerationLabel(product), item: canonical });
  } else if (route.type === 'product') {
    crumbs.push({ name: productBrandLabel(product), item: `${CANONICAL_ORIGIN}${brandPath({ id: productBrandId(product), name: productBrandLabel(product), slug: product.brandSlug })}` });
    crumbs.push({ name: product.name, item: canonical });
  }
  return crumbs.filter((crumb) => crumb.name);
}

export function getPageSeo(route, products = [], loading = false, routePath = '/') {
  const allFilters = { brand: 'all', series: 'all', model: 'all', mod: 'all' };
  const meta = {
    title: `GarageBoy | Auto Body Kits & Automotive Parts`,
    description: SITE_DESCRIPTION,
    canonical: `${CANONICAL_ORIGIN}/`,
    image: DEFAULT_IMAGE,
    imageAlt: 'GarageBoy automotive body kit catalog',
    robots: 'index,follow',
    type: 'website',
    jsonLd: [],
  };

  let pageProducts = [];
  let pageName = '';
  if (route.type === 'home') {
    meta.title = 'GarageBoy | Auto Body Kits & Automotive Parts';
  } else if (route.type === 'admin') {
    meta.title = 'GarageBoy Admin';
    meta.description = 'Private GarageBoy content management.';
    meta.robots = 'noindex,nofollow';
    meta.canonical = `${CANONICAL_ORIGIN}/`;
  } else if (route.type === 'search') {
    meta.title = `Search ${route.query || 'catalog'} | GarageBoy`;
    meta.description = 'Search the GarageBoy product catalog.';
    meta.robots = 'noindex,follow';
    meta.canonical = `${CANONICAL_ORIGIN}/catalog`;
  } else if (route.type === 'notFound') {
    meta.title = 'Page not found | GarageBoy';
    meta.description = 'The requested GarageBoy page is not available.';
    meta.robots = 'noindex,follow';
    meta.canonical = `${CANONICAL_ORIGIN}/`;
  } else if (route.type === 'product') {
    const product = products.find((row) => String(row.id) === String(route.id));
    if (!product) {
      meta.title = loading ? 'Loading product | GarageBoy' : 'Product not found | GarageBoy';
      meta.description = loading ? 'Loading the GarageBoy product catalog.' : 'This product is not currently available.';
      meta.robots = 'noindex,follow';
      meta.canonical = `${CANONICAL_ORIGIN}${routePath}`;
      return meta;
    }
    const vehicle = vehicleLabel([productBrandLabel(product), productSeriesLabel(product), productGenerationLabel(product)]);
    const suffix = vehicle && !cleanText(product.name).toLowerCase().includes(cleanText(vehicle).toLowerCase()) ? ` · ${vehicle}` : '';
    meta.title = `${product.name}${suffix} | GarageBoy`;
    meta.description = product.description
      ? limitDescription(product.description)
      : limitDescription(`View the GarageBoy catalog listing for ${product.name}${vehicle ? `, for ${vehicle}` : ''}${productCategoryLabel(product) ? `, in ${productCategoryLabel(product)}` : ''}.`);
    meta.canonical = `${CANONICAL_ORIGIN}${productPath(product)}`;
    meta.image = productImage(product) || DEFAULT_IMAGE;
    meta.imageAlt = product.images?.find((image) => image?.url)?.alt_text || product.name;
    meta.type = 'product';
    pageProducts = [product];
    pageName = product.name;

    const productSchema = {
      '@type': 'Product',
      name: product.name,
      url: meta.canonical,
    };
    if (product.description) productSchema.description = cleanText(product.description);
    if (meta.image !== DEFAULT_IMAGE) productSchema.image = [meta.image];
    if (product.sku) productSchema.sku = String(product.sku);
    if (productBrandLabel(product)) productSchema.brand = { '@type': 'Brand', name: productBrandLabel(product) };
    meta.jsonLd.push(productSchema);
  } else {
    const filters = route.type === 'brand'
      ? { ...allFilters, brand: route.id }
      : route.type === 'category'
        ? { ...allFilters, mod: route.id }
        : route.type === 'vehicleModel'
          ? { ...allFilters, brand: route.brandId || 'all', series: route.modelId }
          : route.type === 'vehicleGeneration'
            ? { ...allFilters, brand: route.brandId || 'all', series: route.modelId, model: route.generationId }
            : { ...allFilters, ...(route.filters || {}) };
    pageProducts = filteredProducts(products, filters);
    if (route.type === 'vehicleModel' || route.type === 'vehicleGeneration') {
      const first = pageProducts[0];
      filters.brand = route.brandId || productBrandId(first || {});
      pageProducts = filteredProducts(products, filters);
    }
    const sample = pageProducts[0];
    if (!sample && !loading) {
      meta.title = 'Catalog page not found | GarageBoy';
      meta.description = 'This GarageBoy catalog page has no published products.';
      meta.robots = 'noindex,follow';
      meta.canonical = `${CANONICAL_ORIGIN}${routePath}`;
      return meta;
    }

    if (route.type === 'brand') {
      pageName = productBrandLabel(sample || {}) || 'Brand';
      meta.title = `${pageName} Body Kits & Automotive Parts | GarageBoy`;
      meta.description = limitDescription(`Browse ${pageProducts.length} published GarageBoy catalog products for ${pageName} vehicles.`);
      meta.canonical = sample ? `${CANONICAL_ORIGIN}${brandPath({ id: route.id, name: pageName, slug: sample.brandSlug })}` : `${CANONICAL_ORIGIN}${routePath}`;
    } else if (route.type === 'category') {
      pageName = productCategoryLabel(sample || {}) || 'Product category';
      meta.title = `${pageName} | Automotive Parts Catalog | GarageBoy`;
      meta.description = limitDescription(`Browse ${pageProducts.length} published products in the ${pageName} category at GarageBoy.`);
      meta.canonical = sample ? `${CANONICAL_ORIGIN}${categoryPath({ id: route.id, name: pageName })}` : `${CANONICAL_ORIGIN}${routePath}`;
    } else if (route.type === 'vehicleModel' || route.type === 'vehicleGeneration') {
      const brandName = productBrandLabel(sample || {});
      const modelName = productSeriesLabel(sample || {});
      const generationName = route.type === 'vehicleGeneration' ? productGenerationLabel(sample || {}) : '';
      pageName = vehicleLabel([brandName, modelName, generationName]);
      meta.title = `${pageName} Body Kits & Parts | GarageBoy`;
      meta.description = limitDescription(`Browse ${pageProducts.length} published catalog products for ${pageName} at GarageBoy.`);
      if (sample) {
        const brand = { id: productBrandId(sample), name: brandName, slug: sample.brandSlug };
        const model = { id: productSeriesId(sample), name: modelName };
        const path = route.type === 'vehicleGeneration'
          ? vehicleGenerationPath(brand, model, { id: route.generationId, name: generationName })
          : vehicleModelPath(brand, model);
        meta.canonical = `${CANONICAL_ORIGIN}${path}`;
      }
    } else {
      pageName = 'Automotive Parts Catalog';
      meta.title = `${pageName} | GarageBoy`;
      meta.description = limitDescription(`Browse ${products.length} published GarageBoy products by brand, vehicle model, generation, and category.`);
      meta.canonical = `${CANONICAL_ORIGIN}/catalog`;
      if (Object.values(filters).some((value) => value !== 'all')) meta.robots = 'noindex,follow';
    }

    meta.type = 'website';
    if (sample) {
      meta.image = productImage(sample) || DEFAULT_IMAGE;
      meta.imageAlt = sample.images?.find((image) => image?.url)?.alt_text || sample.name;
    }
  }

  const organization = {
    '@type': 'Organization',
    '@id': `${CANONICAL_ORIGIN}/#organization`,
    name: SITE_NAME,
    url: `${CANONICAL_ORIGIN}/`,
    logo: DEFAULT_IMAGE,
    sameAs: ['https://www.instagram.com/garageboy.id/', 'https://www.tiktok.com/@garageboy.id'],
  };
  const website = {
    '@type': 'WebSite',
    '@id': `${CANONICAL_ORIGIN}/#website`,
    url: `${CANONICAL_ORIGIN}/`,
    name: SITE_NAME,
    publisher: { '@id': `${CANONICAL_ORIGIN}/#organization` },
  };
  meta.jsonLd.unshift(organization, website);

  const breadcrumbs = makeBreadcrumbs(route, products, meta.canonical);
  if (breadcrumbs.length) {
    meta.jsonLd.push({
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: cleanText(crumb.name),
        item: crumb.item,
      })),
    });
  }

  if (pageProducts.length > 1) {
    meta.jsonLd.push({
      '@type': 'ItemList',
      itemListElement: pageProducts.map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: product.name,
        url: `${CANONICAL_ORIGIN}${productPath(product)}`,
      })),
    });
  }

  meta.title = cleanText(meta.title);
  meta.description = limitDescription(meta.description);
  return meta;
}

function setMeta(selector, attribute, value) {
  let node = document.head.querySelector(selector);
  if (!node) {
    node = document.createElement('meta');
    document.head.appendChild(node);
  }
  node.setAttribute(attribute, value);
}

export function applyPageSeo(meta) {
  document.title = meta.title;
  document.documentElement.lang = 'en';
  setMeta('meta[name="description"]', 'name', 'description');
  document.head.querySelector('meta[name="description"]').content = meta.description;
  setMeta('meta[name="robots"]', 'name', 'robots');
  document.head.querySelector('meta[name="robots"]').content = meta.robots;

  let canonical = document.head.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = meta.canonical;

  const openGraph = {
    'og:title': meta.title,
    'og:description': meta.description,
    'og:type': meta.type === 'product' ? 'product' : 'website',
    'og:url': meta.canonical,
    'og:image': meta.image,
    'og:image:alt': meta.imageAlt,
    'og:site_name': SITE_NAME,
  };
  Object.entries(openGraph).forEach(([property, content]) => {
    setMeta(`meta[property="${property}"]`, 'property', property);
    document.head.querySelector(`meta[property="${property}"]`).content = content;
  });
  const twitter = {
    'twitter:card': meta.image ? 'summary_large_image' : 'summary',
    'twitter:title': meta.title,
    'twitter:description': meta.description,
    'twitter:image': meta.image,
  };
  Object.entries(twitter).forEach(([name, content]) => {
    setMeta(`meta[name="${name}"]`, 'name', name);
    document.head.querySelector(`meta[name="${name}"]`).content = content;
  });

  let structuredData = document.getElementById('garageboy-structured-data');
  if (!structuredData) {
    structuredData = document.createElement('script');
    structuredData.id = 'garageboy-structured-data';
    structuredData.type = 'application/ld+json';
    document.head.appendChild(structuredData);
  }
  const writeStructuredData = (graph) => {
    structuredData.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
  };
  writeStructuredData(meta.jsonLd);

  if (meta.image && meta.image !== DEFAULT_IMAGE && typeof window.Image === 'function') {
    const imageToCheck = new window.Image();
    const pageCanonical = meta.canonical;
    imageToCheck.onerror = () => {
      const activeCanonical = document.head.querySelector('link[rel="canonical"]')?.href;
      if (activeCanonical !== pageCanonical || meta.image === DEFAULT_IMAGE) return;
      meta.image = DEFAULT_IMAGE;
      meta.imageAlt = 'GarageBoy logo';
      document.head.querySelector('meta[property="og:image"]').content = DEFAULT_IMAGE;
      document.head.querySelector('meta[property="og:image:alt"]').content = meta.imageAlt;
      document.head.querySelector('meta[name="twitter:image"]').content = DEFAULT_IMAGE;
      writeStructuredData(meta.jsonLd.map((item) => {
        if (item['@type'] !== 'Product' || !item.image) return item;
        const product = { ...item };
        delete product.image;
        return product;
      }));
    };
    imageToCheck.src = meta.image;
  }
}
