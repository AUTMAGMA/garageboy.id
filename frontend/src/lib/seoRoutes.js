export const CANONICAL_ORIGIN = 'https://www.garageboy.id';

export function seoSlug(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'item';
}

const encodeId = (value) => encodeURIComponent(String(value || ''));

export function productPath(product) {
  if (!product?.id) return '/catalog';
  return `/products/${seoSlug(product.slug || product.name)}/${encodeId(product.id)}`;
}

export function brandPath(brand) {
  if (!brand?.id) return '/catalog';
  return `/brands/${seoSlug(brand.slug || brand.name || brand.brandLabel || brand.brandSlug)}/${encodeId(brand.id)}`;
}

export function categoryPath(category) {
  if (!category?.id) return '/catalog';
  return `/categories/${seoSlug(category.slug || category.name || category.modLabel)}/${encodeId(category.id)}`;
}

export function vehicleModelPath(brand, model) {
  if (!brand?.id || !model?.id) return '/catalog';
  const brandSlug = seoSlug(brand.slug || brand.name || brand.brandLabel || brand.brandSlug);
  const modelSlug = seoSlug(model.slug || model.name || model.seriesLabel);
  return `/vehicles/${brandSlug}/${modelSlug}/${encodeId(model.id)}`;
}

export function vehicleGenerationPath(brand, model, generation) {
  if (!brand?.id || !model?.id || !generation?.id) return vehicleModelPath(brand, model);
  const modelPath = vehicleModelPath(brand, model);
  const generationSlug = seoSlug(generation.slug || generation.name || generation.modelLabel || generation.year_range);
  return `${modelPath}/${generationSlug}/${encodeId(generation.id)}`;
}

export function parseSeoRoute(locationLike = window.location) {
  if (locationLike.hash === '#admin') return { type: 'admin' };

  const segments = String(locationLike.pathname || '/')
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      try { return decodeURIComponent(segment); } catch { return segment; }
    });
  const params = new URLSearchParams(locationLike.search || '');

  if (!segments.length) return { type: 'home' };
  if (segments[0] === 'catalog' && segments.length === 1) {
    return {
      type: 'catalog',
      filters: {
        brand: params.get('brand') || 'all',
        series: params.get('series') || 'all',
        model: params.get('model') || 'all',
        mod: params.get('mod') || 'all',
      },
    };
  }
  if (segments[0] === 'products' && segments.length >= 3) {
    return { type: 'product', id: segments[segments.length - 1] };
  }
  if (segments[0] === 'brands' && segments.length >= 2) {
    return { type: 'brand', id: segments[segments.length - 1] };
  }
  if (segments[0] === 'categories' && segments.length >= 2) {
    return { type: 'category', id: segments[segments.length - 1] };
  }
  if (segments[0] === 'vehicles' && segments.length >= 4) {
    const route = {
      type: segments.length >= 6 ? 'vehicleGeneration' : 'vehicleModel',
      brandSlug: segments[1],
      modelSlug: segments[2],
      modelId: segments[3],
    };
    if (route.type === 'vehicleGeneration') {
      route.generationSlug = segments[4];
      route.generationId = segments[5];
    }
    return route;
  }
  if (segments[0] === 'search' && segments.length === 1) {
    return {
      type: 'search',
      query: params.get('q') || '',
      filters: {
        brand: params.get('brand') || 'all',
        series: params.get('series') || 'all',
        model: params.get('model') || 'all',
        mod: params.get('mod') || 'all',
      },
    };
  }
  return { type: 'notFound' };
}

export function catalogPathFromFilters(filters, products = []) {
  const all = { brand: 'all', series: 'all', model: 'all', mod: 'all' };
  const active = { ...all, ...filters };
  const entries = Object.entries(active).filter(([, value]) => value && value !== 'all');
  if (!entries.length) return '/catalog';

  const sample = products.find((product) => (
    (active.brand === 'all' || String(product.brand_id || product.brand) === String(active.brand))
    && (active.series === 'all' || String(product.vehicle_model_id || product.series) === String(active.series))
    && (active.model === 'all' || String(product.vehicle_generation_id || product.modelLabel) === String(active.model))
    && (active.mod === 'all' || String(product.category_id || product.mod) === String(active.mod))
  ));

  if (sample && active.mod === 'all' && entries.length === 1 && active.brand !== 'all') {
    return brandPath({ id: active.brand, name: sample.brandLabel, slug: sample.brandSlug });
  }
  if (sample && active.mod === 'all' && active.brand !== 'all' && active.series !== 'all' && entries.length === 2) {
    return vehicleModelPath(
      { id: active.brand, name: sample.brandLabel, slug: sample.brandSlug },
      { id: active.series, name: sample.seriesLabel },
    );
  }
  if (sample && active.mod === 'all' && active.brand !== 'all' && active.series !== 'all' && active.model !== 'all' && entries.length === 3) {
    return vehicleGenerationPath(
      { id: active.brand, name: sample.brandLabel, slug: sample.brandSlug },
      { id: active.series, name: sample.seriesLabel },
      { id: active.model, name: sample.modelLabel },
    );
  }
  if (sample && active.brand === 'all' && active.series === 'all' && active.model === 'all' && active.mod !== 'all') {
    return categoryPath({ id: active.mod, name: sample.modLabel });
  }

  const query = new URLSearchParams();
  Object.entries(active).forEach(([key, value]) => {
    if (value && value !== 'all') query.set(key, value);
  });
  return `/catalog?${query.toString()}`;
}
