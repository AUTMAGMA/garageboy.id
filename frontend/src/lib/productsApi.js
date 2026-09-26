const API_BASE_URL = (
  process.env.REACT_APP_API_BASE_URL
  || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : '')
).replace(/\/$/, '');

export async function fetchProducts(signal) {
  if (!API_BASE_URL) {
    throw new Error('Product API URL is not configured. Set REACT_APP_API_BASE_URL.');
  }

  const response = await fetch(`${API_BASE_URL}/api/products`, { signal });
  if (!response.ok) {
    throw new Error(`Product API returned HTTP ${response.status}.`);
  }

  const payload = await response.json();
  const products = Array.isArray(payload) ? payload : payload?.data;
  if (!Array.isArray(products)) {
    throw new Error('Product API response must contain a product list.');
  }

  return products;
}

async function request(path, { token, method = 'GET', body, signal } = {}) {
  const headers = {};
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isFormData) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : (isFormData ? body : JSON.stringify(body)),
    signal,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail || `API returned HTTP ${response.status}.`);
  }
  if (response.status === 204) return null;
  return response.json();
}

export function fetchHotBrands(signal) {
  return request('/api/hot-brands', { signal });
}

export function fetchHomeCarousel(signal) {
  return request('/api/home/carousel', { signal });
}

export async function fetchLatestModifications(signal) {
  const items = await request('/api/latest-modifications', { signal });
  return items.map((item) => item.product);
}

export function adminRequest(path, token, options = {}) {
  return request(path, { ...options, token });
}

export function loginAdmin(email, password) {
  return request('/api/admin/login', { method: 'POST', body: { email, password } });
}

export function uploadAdminImage(file, token) {
  const form = new FormData();
  form.append('file', file);
  return request('/api/admin/uploads', { method: 'POST', body: form, token });
}
