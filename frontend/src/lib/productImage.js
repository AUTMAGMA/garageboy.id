import { asset } from './asset';

const FALLBACK_IMAGE = '/catalog/product-placeholder.svg';

// asset() leaves remote/data URLs alone and resolves local files for GitHub Pages.
export function productImageSrc(source) {
  return asset(typeof source === 'string' && source.trim() ? source : FALLBACK_IMAGE);
}

export function useFallbackImage(event) {
  const image = event.currentTarget;
  if (image.dataset.fallbackApplied === 'true') return;

  image.dataset.fallbackApplied = 'true';
  image.src = asset(FALLBACK_IMAGE);
}
