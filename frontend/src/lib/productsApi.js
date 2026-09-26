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
