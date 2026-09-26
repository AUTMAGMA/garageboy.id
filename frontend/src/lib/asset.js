/**
 * Resolve local public assets correctly on localhost and GitHub Pages.
 */
export function asset(path) {
  if (!path || typeof path !== 'string') return '';

  // Jangan ubah URL external / data URL
  if (/^(https?:|data:|blob:|\/\/)/i.test(path)) {
    return path;
  }

  // Hilangkan ./ atau / di awal
  const clean = path.replace(/^\.\//, '').replace(/^\//, '');

  // PUBLIC_URL akan menjadi /garageboy.id saat production build
  const base = (process.env.PUBLIC_URL || '').replace(/\/$/, '');

  return `${base}/${clean}`;
}

export default asset;s
