/** Resolve public assets for both a domain root and a GitHub Pages project path. */
export function asset(path) {
  if (typeof path !== 'string' || !path) return '';
  if (/^(?:[a-z]+:|\/\/|data:|blob:)/i.test(path)) return path;

  const publicUrl = process.env.PUBLIC_URL || '';
  const configuredPath = publicUrl
    ? new URL(publicUrl, window.location.origin).pathname.replace(/\/$/, '')
    : '';
  const currentPath = window.location.pathname;
  const isHostedAtConfiguredPath = configuredPath
    && (currentPath === configuredPath || currentPath.startsWith(`${configuredPath}/`));
  const basePath = isHostedAtConfiguredPath ? configuredPath : '';
  const relativePath = path.replace(/^(?:\.\/|\/)+/, '');

  return `${basePath}/${relativePath}`;
}

export default asset;
