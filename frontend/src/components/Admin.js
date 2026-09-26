import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDown, ArrowLeft, ArrowUp, Boxes, Building2, Check, ChevronDown, ChevronRight,
  Eye, EyeOff, ImagePlus, LayoutDashboard, LogOut, Package, Plus, Save, Shapes, Trash2,
} from 'lucide-react';
import { adminRequest, loginAdmin, uploadAdminImage } from '../lib/productsApi';
import { productImageSrc, useFallbackImage } from '../lib/productImage';
import './Admin.css';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'brands', label: 'Brands', icon: Building2 },
  { id: 'categories', label: 'Categories', icon: Shapes },
  { id: 'home', label: 'Home content', icon: Boxes },
];

const blankProduct = () => ({
  name: '', brand_id: '', vehicle_model_id: '', vehicle_generation_id: '', category_id: '',
  description: '', sku: '', material: '', compatibility_notes: '', ordering_status: 'available',
  featured: false, published: true, catalog_page: '', images: [],
});

const blankBrand = () => ({ name: '', slug: '', logo_url: '', country: '', sort_order: 0, published: true });
const blankCategory = () => ({ name: '', name_id: '', slug: '', description: '', sort_order: 0 });
const blankHotBrand = () => ({ brand_id: '', logo_url: '', sort_order: 0, published: true, logo_fit: 'contain', logo_scale: 100, logo_position_x: 50, logo_position_y: 50 });
const blankLatest = () => ({ product_id: '', title_override: '', image_url_override: '', sort_order: 0 });
const blankCarousel = () => ({ title: '', subtitle: '', button_text: '', image_url: '', sort_order: 0, published: true, destination_type: 'all_catalog', destination: { brand_id: '', vehicle_model_id: '', vehicle_generation_id: '', category_id: '', custom_url: '' } });
const makeId = () => (window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
const carouselInputBody = (item, sortOrder = item.sort_order) => ({
  title: item.title,
  subtitle: item.subtitle || '',
  button_text: item.button_text || '',
  image_url: item.image_url,
  sort_order: sortOrder,
  published: item.published !== false,
  destination_type: item.destination_type || 'all_catalog',
  destination: Object.fromEntries(Object.entries(item.destination || {}).filter(([, value]) => value)),
});
const hotBrandInputBody = (item, overrides = {}) => ({
  brand_id: item.brand_id,
  logo_url: item.logo_url || '',
  sort_order: item.sort_order || 0,
  published: item.published !== false,
  logo_fit: item.logo_fit || 'contain',
  logo_scale: item.logo_scale ?? 100,
  logo_position_x: item.logo_position_x ?? 50,
  logo_position_y: item.logo_position_y ?? 50,
  ...overrides,
});

function Field({ label, children, className = '' }) {
  return <label className={`block space-y-1.5 ${className}`}><span className="text-xs font-medium text-slate-400">{label}</span>{children}</label>;
}

function AdminSelect({ children, className = '', ...props }) {
  return (
    <div className="admin-select-wrap">
      <select {...props} className={`admin-select ${className}`}>
        {children}
      </select>
      <ChevronDown aria-hidden="true" size={16} className={`admin-select-chevron${props.disabled ? ' admin-select-chevron-disabled' : ''}`} />
    </div>
  );
}

const inputClass = 'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-red-500';
const primaryButton = 'inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButton = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800';

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
      <input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-red-500" />
      {label}
    </label>
  );
}

function EmptyState({ children }) {
  return <div className="rounded-xl border border-dashed border-slate-700 px-5 py-10 text-center text-sm text-slate-500">{children}</div>;
}

function Admin() {
  const [token, setToken] = useState(() => sessionStorage.getItem('garageboy_admin_token') || '');
  const [admin, setAdmin] = useState(null);
  const [login, setLogin] = useState({ email: '', password: '' });
  const [tab, setTab] = useState('dashboard');
  const [data, setData] = useState({ products: [], brands: [], categories: [], models: [], generations: [], hotBrands: [], latest: [], carousel: [], uploadStatus: { configured: null } });
  const [productForm, setProductForm] = useState(null);
  const [brandForm, setBrandForm] = useState(null);
  const [categoryForm, setCategoryForm] = useState(null);
  const [hotForm, setHotForm] = useState(blankHotBrand);
  const [latestForm, setLatestForm] = useState(blankLatest);
  const [carouselForm, setCarouselForm] = useState(blankCarousel);
  const [productQuery, setProductQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadData = useCallback(async (authToken = token) => {
    if (!authToken) return;
    setBusy(true);
    setError('');
    try {
      const [products, brands, categories, models, generations, hotBrands, latest, carousel, uploadStatus] = await Promise.all([
        adminRequest('/api/admin/products', authToken),
        adminRequest('/api/admin/brands', authToken),
        adminRequest('/api/admin/categories', authToken),
        adminRequest('/api/vehicle-models', authToken),
        adminRequest('/api/vehicle-generations', authToken),
        adminRequest('/api/admin/hot-brands', authToken),
        adminRequest('/api/admin/latest-modifications', authToken),
        adminRequest('/api/admin/home/carousel', authToken),
        adminRequest('/api/admin/uploads/status', authToken),
      ]);
      setData({ products, brands, categories, models, generations, hotBrands, latest, carousel, uploadStatus });
    } catch (loadError) {
      setError(loadError.message);
      if (/401|authentication|token/i.test(loadError.message)) {
        sessionStorage.removeItem('garageboy_admin_token');
        setToken('');
        setAdmin(null);
      }
    } finally {
      setBusy(false);
    }
  }, [token]);

  useEffect(() => { if (token) loadData(token); }, [token, loadData]);

  const notify = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3500);
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await loginAdmin(login.email, login.password);
      sessionStorage.setItem('garageboy_admin_token', result.access_token);
      setAdmin(result.admin);
      setToken(result.access_token);
      setLogin({ email: '', password: '' });
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setBusy(false);
    }
  };

  const signOut = () => {
    sessionStorage.removeItem('garageboy_admin_token');
    setToken('');
    setAdmin(null);
    setData({ products: [], brands: [], categories: [], models: [], generations: [], hotBrands: [], latest: [], carousel: [], uploadStatus: { configured: null } });
  };

  const save = async (path, method, body, successMessage) => {
    setBusy(true);
    setError('');
    try {
      await adminRequest(path, token, { method, body });
      await loadData(token);
      notify(successMessage);
      return true;
    } catch (saveError) {
      setError(saveError.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const remove = async (path, message) => {
    if (!window.confirm(message)) return;
    setBusy(true);
    setError('');
    try {
      await adminRequest(path, token, { method: 'DELETE' });
      await loadData(token);
      notify('Item dihapus.');
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setBusy(false);
    }
  };

  const uploadImage = async (file, onUploaded) => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const result = await uploadAdminImage(file, token);
      onUploaded(result.url);
      notify('Gambar berhasil diunggah. Simpan perubahan untuk menerapkan URL.');
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setBusy(false);
    }
  };

  const modelOptions = useMemo(
    () => data.models.filter((item) => item.brand_id === productForm?.brand_id),
    [data.models, productForm?.brand_id]
  );
  const generationOptions = useMemo(
    () => data.generations.filter((item) => item.model_id === productForm?.vehicle_model_id),
    [data.generations, productForm?.vehicle_model_id]
  );
  const visibleProducts = useMemo(() => {
    const query = productQuery.trim().toLowerCase();
    return data.products.filter((product) => !query || `${product.name} ${product.sku || ''}`.toLowerCase().includes(query));
  }, [data.products, productQuery]);

  const editProduct = (product) => setProductForm({
    ...blankProduct(),
    ...product,
    category_id: product.category_id || '',
    catalog_page: product.catalog_page ?? '',
    images: (product.images || []).map((image, index) => ({ ...image, sort_order: index })),
  });

  const submitProduct = async (event) => {
    event.preventDefault();
    const body = {
      name: productForm.name,
      brand_id: productForm.brand_id,
      vehicle_model_id: productForm.vehicle_model_id,
      vehicle_generation_id: productForm.vehicle_generation_id,
      category_id: productForm.category_id || null,
      description: productForm.description || '',
      sku: productForm.sku || '',
      material: productForm.material || '',
      compatibility_notes: productForm.compatibility_notes || '',
      ordering_status: productForm.ordering_status || '',
      featured: Boolean(productForm.featured),
      published: Boolean(productForm.published),
      catalog_page: productForm.catalog_page === '' ? null : Number(productForm.catalog_page),
      images: productForm.images.map((image, index) => ({ ...image, sort_order: index })),
    };
    const editing = Boolean(productForm.id);
    const ok = await save(editing ? `/api/products/${productForm.id}` : '/api/products', editing ? 'PUT' : 'POST', body, editing ? 'Produk diperbarui.' : 'Produk dibuat.');
    if (ok) setProductForm(null);
  };

  const addImage = () => setProductForm((current) => ({
    ...current,
    images: [...current.images, { id: makeId(), url: '', thumb: '', alt_text: '', sort_order: current.images.length }],
  }));

  const updateImage = (index, field, value) => setProductForm((current) => ({
    ...current,
    images: current.images.map((image, imageIndex) => imageIndex === index ? { ...image, [field]: value } : image),
  }));

  const moveImage = (index, offset) => setProductForm((current) => {
    const images = [...current.images];
    const target = index + offset;
    if (target < 0 || target >= images.length) return current;
    [images[index], images[target]] = [images[target], images[index]];
    return { ...current, images: images.map((image, position) => ({ ...image, sort_order: position })) };
  });

  const saveHomeItemOrder = async (type, item, offset) => {
    const rows = type === 'hot-brands' ? data.hotBrands : type === 'home/carousel' ? data.carousel : data.latest;
    const index = rows.findIndex((row) => row.id === item.id);
    const targetIndex = index + offset;
    if (targetIndex < 0 || targetIndex >= rows.length) return;
    const other = rows[targetIndex];
    const itemOrder = item.sort_order ?? index;
    const otherOrder = other.sort_order ?? targetIndex;
    const itemBody = type === 'hot-brands'
      ? hotBrandInputBody(item, { sort_order: otherOrder })
      : type === 'home/carousel'
        ? carouselInputBody(item, otherOrder)
        : { product_id: item.product_id, title_override: item.title_override || null, image_url_override: item.image_url_override || null, sort_order: otherOrder };
    const otherBody = type === 'hot-brands'
      ? hotBrandInputBody(other, { sort_order: itemOrder })
      : type === 'home/carousel'
        ? carouselInputBody(other, itemOrder)
        : { product_id: other.product_id, title_override: other.title_override || null, image_url_override: other.image_url_override || null, sort_order: itemOrder };
    await Promise.all([
      adminRequest(`/api/${type}/${item.id}`, token, { method: 'PATCH', body: itemBody }),
      adminRequest(`/api/${type}/${other.id}`, token, { method: 'PATCH', body: otherBody }),
    ]).then(() => loadData(token)).catch((orderError) => setError(orderError.message));
  };

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <form onSubmit={handleLogin} className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl shadow-black/40">
          <a href="/" className="mb-7 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={16} /> Kembali ke website</a>
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-red-600/15 text-red-400"><ShieldIcon /></div>
          <h1 className="text-2xl font-semibold">GarageBoy CMS</h1>
          <p className="mt-1 text-sm text-slate-400">Masuk dengan akun administrator.</p>
          <div className="mt-6 space-y-4">
            <Field label="Email"><input className={inputClass} type="email" autoComplete="username" value={login.email} onChange={(event) => setLogin({ ...login, email: event.target.value })} required /></Field>
            <Field label="Password"><input className={inputClass} type="password" autoComplete="current-password" value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} required /></Field>
          </div>
          {error && <p role="alert" className="mt-4 rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">{error}</p>}
          <button className={`${primaryButton} mt-6 w-full`} disabled={busy}>{busy ? 'Memeriksa…' : 'Masuk ke Admin'}</button>
        </form>
      </main>
    );
  }

  return (
    <div className="admin-page min-h-screen bg-slate-950 text-slate-100 lg:flex">
      <aside className="border-b border-slate-800 bg-slate-900 lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white"><Package size={20} /></div>
          <div><p className="font-semibold">GarageBoy</p><p className="text-xs text-slate-500">Content management</p></div>
        </div>
        <nav className="flex gap-1 overflow-x-auto p-3 lg:flex-1 lg:flex-col">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)} className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${tab === id ? 'bg-red-600/15 font-medium text-red-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <Icon size={17} /> {label}
            </button>
          ))}
        </nav>
        <div className="hidden border-t border-slate-800 p-4 lg:block">
          <div className="mb-3 truncate text-xs text-slate-500">{admin?.email || 'Administrator'}</div>
          <button onClick={signOut} className={`${secondaryButton} w-full`}><LogOut size={15} /> Sign out</button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 lg:ml-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-800 bg-slate-950/90 px-5 py-4 backdrop-blur md:px-8">
          <div><p className="text-xs uppercase tracking-[0.16em] text-slate-500">GarageBoy / Admin</p><h1 className="mt-1 text-lg font-semibold">{tabs.find((item) => item.id === tab)?.label}</h1></div>
          <div className="flex items-center gap-3"><span className="hidden text-sm text-slate-400 sm:block">{admin?.name || admin?.email}</span><button onClick={signOut} aria-label="Sign out" className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800 lg:hidden"><LogOut size={17} /></button><a href="/" className="hidden text-sm text-slate-400 hover:text-white sm:block">View site <ChevronRight className="inline" size={14} /></a></div>
        </header>
        <div className="mx-auto max-w-[1500px] space-y-5 p-5 md:p-8">
          {error && <div role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-red-900/80 bg-red-950/40 px-4 py-3 text-sm text-red-200"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error"><EyeOff size={16} /></button></div>}
          {notice && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-900/80 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"><Check size={16} />{notice}</div>}

          {tab === 'dashboard' && (
            <>
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ['Products', data.products.length, Package],
                  ['Published products', data.products.filter((item) => item.published !== false).length, Eye],
                  ['Brands', data.brands.length, Building2],
                  ['Home selections', data.hotBrands.length + data.latest.length, Activity],
                ].map(([label, count, Icon]) => <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-center justify-between text-sm text-slate-400"><span>{label}</span><Icon size={18} /></div><p className="mt-4 text-3xl font-semibold text-white">{count}</p></div>)}
              </section>
              <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="font-semibold">Content overview</h2><p className="mt-2 text-sm text-slate-400">Katalog, brand, kategori, dan pilihan konten Home tersimpan di MongoDB.</p><div className="mt-4 flex flex-wrap gap-2"><button className={secondaryButton} onClick={() => setTab('products')}>Manage products <ChevronRight size={15} /></button><button className={secondaryButton} onClick={() => setTab('home')}>Manage Home sections <ChevronRight size={15} /></button></div></section>
            </>
          )}

          {tab === 'products' && (
            <div className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.9fr)]">
              <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Product catalog</h2><p className="mt-1 text-xs text-slate-500">{data.products.length} MongoDB records</p></div><button onClick={() => setProductForm(blankProduct())} className={primaryButton}><Plus size={16} /> New product</button></div>
                <input className={`${inputClass} mb-4`} value={productQuery} onChange={(event) => setProductQuery(event.target.value)} placeholder="Search name or SKU" />
                <div className="space-y-2">
                  {visibleProducts.map((product) => (
                    <div key={product.id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                      <img src={productImageSrc(product.img)} onError={useFallbackImage} alt="" className="h-14 w-16 rounded-lg bg-slate-800 object-cover" />
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{product.name}</p><p className="mt-1 truncate text-xs text-slate-500">{product.brandLabel || 'Brand missing'} · {product.seriesLabel || 'Model missing'} · {product.sku || product.id}</p><span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] ${product.published === false ? 'bg-slate-800 text-slate-400' : 'bg-emerald-950 text-emerald-300'}`}>{product.published === false ? 'Draft' : 'Published'}</span></div>
                      <button onClick={() => editProduct(product)} className={secondaryButton}>Edit</button>
                      <button onClick={() => remove(`/api/products/${product.id}`, `Hapus produk “${product.name}” dari MongoDB?`)} aria-label="Delete product" className="rounded-lg p-2 text-slate-500 hover:bg-red-950 hover:text-red-300"><Trash2 size={17} /></button>
                    </div>
                  ))}
                  {!busy && visibleProducts.length === 0 && <EmptyState>Tidak ada produk yang cocok.</EmptyState>}
                </div>
              </section>

              {productForm && (
                <form onSubmit={submitProduct} className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <div className="flex items-start justify-between"><div><h2 className="font-semibold">{productForm.id ? 'Edit product' : 'Create product'}</h2><p className="mt-1 text-xs text-slate-500">Field produk mengikuti dokumen MongoDB.</p></div><button type="button" onClick={() => setProductForm(null)} className="text-sm text-slate-500 hover:text-white">Close</button></div>
                  <Field label="Product name"><input className={inputClass} value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} required /></Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Brand"><AdminSelect value={productForm.brand_id} onChange={(event) => setProductForm({ ...productForm, brand_id: event.target.value, vehicle_model_id: '', vehicle_generation_id: '' })} required><option value="">Select brand</option>{data.brands.filter((brand) => brand.published !== false).map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</AdminSelect></Field>
                    <Field label="Model"><AdminSelect value={productForm.vehicle_model_id} onChange={(event) => setProductForm({ ...productForm, vehicle_model_id: event.target.value, vehicle_generation_id: '' })} required><option value="">Select model</option>{modelOptions.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}</AdminSelect></Field>
                    <Field label="Generation"><AdminSelect value={productForm.vehicle_generation_id} onChange={(event) => setProductForm({ ...productForm, vehicle_generation_id: event.target.value })} required><option value="">Select generation</option>{generationOptions.map((generation) => <option key={generation.id} value={generation.id}>{generation.year_range || generation.name}</option>)}</AdminSelect></Field>
                    <Field label="Product category"><AdminSelect value={productForm.category_id} onChange={(event) => setProductForm({ ...productForm, category_id: event.target.value })}><option value="">No category</option>{data.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</AdminSelect></Field>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2"><Field label="SKU"><input className={inputClass} value={productForm.sku || ''} onChange={(event) => setProductForm({ ...productForm, sku: event.target.value })} /></Field><Field label="Catalog page"><input type="number" min="1" className={inputClass} value={productForm.catalog_page} onChange={(event) => setProductForm({ ...productForm, catalog_page: event.target.value })} /></Field></div>
                  <Field label="Description"><textarea rows="3" className={inputClass} value={productForm.description || ''} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} /></Field>
                  <div className="grid gap-3 sm:grid-cols-2"><Field label="Material"><input className={inputClass} value={productForm.material || ''} onChange={(event) => setProductForm({ ...productForm, material: event.target.value })} /></Field><Field label="Fitment / compatibility notes"><input className={inputClass} value={productForm.compatibility_notes || ''} onChange={(event) => setProductForm({ ...productForm, compatibility_notes: event.target.value })} /></Field></div>
                  <Field label="Ordering status"><input className={inputClass} value={productForm.ordering_status || ''} onChange={(event) => setProductForm({ ...productForm, ordering_status: event.target.value })} /></Field>

                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-medium">Product images</h3><p className="mt-1 text-xs text-slate-500">URL gambar disimpan pada field images yang sudah ada.</p></div><button type="button" onClick={addImage} className={secondaryButton}><ImagePlus size={15} /> Add URL</button></div>
                    <div className="space-y-3">
                      {productForm.images.map((image, index) => (
                        <div key={image.id || index} className="rounded-lg border border-slate-800 p-3">
                          <div className="flex gap-3"><img src={productImageSrc(image.url)} alt={image.alt_text || ''} onError={useFallbackImage} className="h-16 w-20 rounded bg-slate-800 object-cover" /><div className="min-w-0 flex-1 space-y-2"><input className={inputClass} type="url" placeholder="https://…" value={image.url || ''} onChange={(event) => updateImage(index, 'url', event.target.value)} required={index === 0} /><input aria-label="Upload product image" className="block w-full text-xs text-slate-400" type="file" accept=".jpg,.jpeg,.png,.webp,.svg,image/jpeg,image/png,image/webp,image/svg+xml" onChange={(event) => uploadImage(event.target.files?.[0], (url) => updateImage(index, 'url', url))} /><input className={inputClass} placeholder="Alt text" value={image.alt_text || ''} onChange={(event) => updateImage(index, 'alt_text', event.target.value)} /></div></div>
                          <div className="mt-2 flex justify-end gap-1"><button type="button" onClick={() => moveImage(index, -1)} aria-label="Move image up" className="rounded p-1.5 text-slate-400 hover:bg-slate-800"><ArrowUp size={15} /></button><button type="button" onClick={() => moveImage(index, 1)} aria-label="Move image down" className="rounded p-1.5 text-slate-400 hover:bg-slate-800"><ArrowDown size={15} /></button><button type="button" onClick={() => setProductForm({ ...productForm, images: productForm.images.filter((_, imageIndex) => imageIndex !== index) })} aria-label="Remove image" className="rounded p-1.5 text-red-300 hover:bg-red-950"><Trash2 size={15} /></button></div>
                        </div>
                      ))}
                      {productForm.images.length === 0 && <p className="text-xs text-slate-500">Belum ada gambar.</p>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-5"><Toggle label="Published" checked={productForm.published} onChange={(value) => setProductForm({ ...productForm, published: value })} /><Toggle label="Featured" checked={productForm.featured} onChange={(value) => setProductForm({ ...productForm, featured: value })} /></div>
                  <button className={`${primaryButton} w-full`} disabled={busy}><Save size={16} />{busy ? 'Saving…' : 'Save product'}</button>
                </form>
              )}
            </div>
          )}

          {tab === 'brands' && (
            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
              <section className="space-y-3">
                {data.brands.map((brand) => (
                  <div key={brand.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <img src={brand.logo_url || '/garageboy-logo.png'} onError={useFallbackImage} alt="" className="h-12 w-14 rounded bg-slate-950 object-contain p-1" />
                    <div className="min-w-0 flex-1"><p className="truncate font-medium">{brand.name}</p><p className="truncate text-xs text-slate-500">{brand.slug}</p><p className="mt-1 text-[11px] text-slate-500">{brand.published === false ? 'Unpublished' : 'Published'}</p></div>
                    <button className={secondaryButton} onClick={() => setBrandForm({ ...blankBrand(), ...brand })}>Edit</button>
                    <button aria-label="Delete brand" onClick={() => remove(`/api/brands/${brand.id}`, `Hapus brand “${brand.name}”? Brand yang masih dipakai produk tidak dapat dihapus.`)} className="rounded-lg p-2 text-slate-500 hover:bg-red-950 hover:text-red-300"><Trash2 size={17} /></button>
                  </div>
                ))}
                {!data.brands.length && <EmptyState>Belum ada brand.</EmptyState>}
              </section>
              <form onSubmit={async (event) => { event.preventDefault(); const editing = Boolean(brandForm.id); const body = { name: brandForm.name, slug: brandForm.slug || '', logo_url: brandForm.logo_url || '', country: brandForm.country || '', sort_order: Number(brandForm.sort_order || 0), published: Boolean(brandForm.published) }; const ok = await save(editing ? `/api/brands/${brandForm.id}` : '/api/brands', editing ? 'PUT' : 'POST', body, editing ? 'Brand diperbarui.' : 'Brand dibuat.'); if (ok) setBrandForm(null); }} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex justify-between"><h2 className="font-semibold">{brandForm?.id ? 'Edit brand' : 'New brand'}</h2><button type="button" onClick={() => setBrandForm(blankBrand())} className="text-xs text-slate-400">Clear</button></div>
                {brandForm && <><Field label="Name"><input className={inputClass} value={brandForm.name} onChange={(event) => setBrandForm({ ...brandForm, name: event.target.value })} required /></Field><Field label="Slug"><input className={inputClass} value={brandForm.slug || ''} onChange={(event) => setBrandForm({ ...brandForm, slug: event.target.value })} /></Field><Field label="Logo URL"><input className={inputClass} type="url" value={brandForm.logo_url || ''} onChange={(event) => setBrandForm({ ...brandForm, logo_url: event.target.value })} placeholder="https://…" />{brandForm.logo_url && <img src={brandForm.logo_url} onError={useFallbackImage} alt="Logo preview" className="mt-2 h-14 w-20 rounded bg-slate-950 object-contain p-2" />}</Field><div className="grid grid-cols-2 gap-3"><Field label="Country"><input className={inputClass} value={brandForm.country || ''} onChange={(event) => setBrandForm({ ...brandForm, country: event.target.value })} /></Field><Field label="Order"><input type="number" className={inputClass} value={brandForm.sort_order || 0} onChange={(event) => setBrandForm({ ...brandForm, sort_order: Number(event.target.value) })} /></Field></div><Toggle label="Published" checked={brandForm.published} onChange={(value) => setBrandForm({ ...brandForm, published: value })} /><button className={`${primaryButton} w-full`} disabled={busy}><Save size={15} /> Save brand</button></>}
              </form>
            </div>
          )}

          {tab === 'categories' && (
            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
              <section className="space-y-3">{data.categories.map((category) => <div key={category.id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-slate-300"><Shapes size={18} /></div><div className="min-w-0 flex-1"><p className="truncate font-medium">{category.name}</p><p className="truncate text-xs text-slate-500">{category.slug}</p></div><button className={secondaryButton} onClick={() => setCategoryForm({ ...blankCategory(), ...category })}>Edit</button><button aria-label="Delete category" onClick={() => remove(`/api/categories/${category.id}`, `Hapus kategori “${category.name}”? Kategori yang dipakai produk tidak dapat dihapus.`)} className="rounded-lg p-2 text-slate-500 hover:bg-red-950 hover:text-red-300"><Trash2 size={17} /></button></div>)}{!data.categories.length && <EmptyState>Belum ada kategori.</EmptyState>}</section>
              <form onSubmit={async (event) => { event.preventDefault(); const editing = Boolean(categoryForm.id); const body = { name: categoryForm.name, name_id: categoryForm.name_id || '', slug: categoryForm.slug || '', description: categoryForm.description || '', sort_order: Number(categoryForm.sort_order || 0) }; const ok = await save(editing ? `/api/categories/${categoryForm.id}` : '/api/categories', editing ? 'PUT' : 'POST', body, editing ? 'Kategori diperbarui.' : 'Kategori dibuat.'); if (ok) setCategoryForm(null); }} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex justify-between"><h2 className="font-semibold">{categoryForm?.id ? 'Edit category' : 'New category'}</h2><button type="button" onClick={() => setCategoryForm(blankCategory())} className="text-xs text-slate-400">Clear</button></div>
                {categoryForm && <><Field label="Name"><input className={inputClass} value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} required /></Field><Field label="Indonesian name"><input className={inputClass} value={categoryForm.name_id || ''} onChange={(event) => setCategoryForm({ ...categoryForm, name_id: event.target.value })} /></Field><Field label="Slug"><input className={inputClass} value={categoryForm.slug || ''} onChange={(event) => setCategoryForm({ ...categoryForm, slug: event.target.value })} /></Field><Field label="Description"><textarea rows="3" className={inputClass} value={categoryForm.description || ''} onChange={(event) => setCategoryForm({ ...categoryForm, description: event.target.value })} /></Field><Field label="Order"><input type="number" className={inputClass} value={categoryForm.sort_order || 0} onChange={(event) => setCategoryForm({ ...categoryForm, sort_order: Number(event.target.value) })} /></Field><button className={`${primaryButton} w-full`} disabled={busy}><Save size={15} /> Save category</button></>}
              </form>
            </div>
          )}

          {tab === 'home' && (
            <div className="grid items-start gap-5 xl:grid-cols-2">
              <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5 xl:col-span-2">
                <div><h2 className="font-semibold">Home Carousel</h2><p className="mt-1 text-xs text-slate-500">Mengatur konten carousel tanpa mengubah tampilan publik.</p></div>
                {data.uploadStatus.configured === false && <p role="status" className="rounded-lg border border-amber-900/70 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">{data.uploadStatus.message || 'Upload storage belum tersedia. URL gambar tetap bisa digunakan.'}</p>}
                <form onSubmit={async (event) => { event.preventDefault(); const editing = Boolean(carouselForm.id); const body = carouselInputBody(carouselForm); const ok = await save(editing ? `/api/home/carousel/${carouselForm.id}` : '/api/home/carousel', editing ? 'PUT' : 'POST', body, editing ? 'Carousel diperbarui.' : 'Slide carousel dibuat.'); if (ok) setCarouselForm(blankCarousel()); }} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 md:grid-cols-2">
                  <Field label="Title"><input className={inputClass} value={carouselForm.title} onChange={(event) => setCarouselForm({ ...carouselForm, title: event.target.value })} required /></Field>
                  <Field label="Subtitle"><input className={inputClass} value={carouselForm.subtitle || ''} onChange={(event) => setCarouselForm({ ...carouselForm, subtitle: event.target.value })} /></Field>
                  <Field label="Button text"><input className={inputClass} value={carouselForm.button_text || ''} onChange={(event) => setCarouselForm({ ...carouselForm, button_text: event.target.value })} /></Field>
                  <Field label="Image URL"><input className={inputClass} type="url" value={carouselForm.image_url || ''} onChange={(event) => setCarouselForm({ ...carouselForm, image_url: event.target.value })} required={!carouselForm.id} /><input className="mt-2 block w-full text-xs text-slate-400" type="file" accept=".jpg,.jpeg,.png,.webp,.svg,image/jpeg,image/png,image/webp,image/svg+xml" onChange={(event) => uploadImage(event.target.files?.[0], (url) => setCarouselForm((current) => ({ ...current, image_url: url })))} />{carouselForm.image_url && <img src={carouselForm.image_url} onError={useFallbackImage} alt="Carousel preview" className="mt-2 h-24 w-full rounded bg-slate-900 object-cover" />}{carouselForm.id && carouselForm.image_url && <button type="button" className="mt-2 text-xs text-red-300 hover:text-red-200" onClick={() => setCarouselForm((current) => ({ ...current, image_url: '' }))}>Remove image</button>}</Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Order"><input type="number" className={inputClass} value={carouselForm.sort_order} onChange={(event) => setCarouselForm({ ...carouselForm, sort_order: Number(event.target.value) })} /></Field>
                    <div className="pt-6"><Toggle label="Published" checked={carouselForm.published} onChange={(value) => setCarouselForm({ ...carouselForm, published: value })} /></div>
                  </div>
                  <Field label="Destination" className="md:col-span-2"><AdminSelect value={carouselForm.destination_type} onChange={(event) => setCarouselForm({ ...carouselForm, destination_type: event.target.value, destination: blankCarousel().destination })}><option value="all_catalog">All catalog</option><option value="catalog_filter">Catalog filters</option><option value="custom_url">Custom URL</option></AdminSelect></Field>
                  {carouselForm.destination_type === 'catalog_filter' && <div className="grid gap-2 sm:grid-cols-2 md:col-span-2 xl:grid-cols-4">
                    <AdminSelect aria-label="Destination brand" value={carouselForm.destination.brand_id} onChange={(event) => setCarouselForm({ ...carouselForm, destination: { ...carouselForm.destination, brand_id: event.target.value, vehicle_model_id: '', vehicle_generation_id: '' } })}><option value="">Any brand</option>{data.brands.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</AdminSelect>
                    <AdminSelect aria-label="Destination model" value={carouselForm.destination.vehicle_model_id} onChange={(event) => setCarouselForm({ ...carouselForm, destination: { ...carouselForm.destination, vehicle_model_id: event.target.value, vehicle_generation_id: '' } })}><option value="">Any series/model</option>{data.models.filter((row) => !carouselForm.destination.brand_id || row.brand_id === carouselForm.destination.brand_id).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</AdminSelect>
                    <AdminSelect aria-label="Destination generation" value={carouselForm.destination.vehicle_generation_id} onChange={(event) => setCarouselForm({ ...carouselForm, destination: { ...carouselForm.destination, vehicle_generation_id: event.target.value } })}><option value="">Any generation</option>{data.generations.filter((row) => !carouselForm.destination.vehicle_model_id || row.model_id === carouselForm.destination.vehicle_model_id).map((row) => <option key={row.id} value={row.id}>{row.year_range || row.name}</option>)}</AdminSelect>
                    <AdminSelect aria-label="Destination category" value={carouselForm.destination.category_id} onChange={(event) => setCarouselForm({ ...carouselForm, destination: { ...carouselForm.destination, category_id: event.target.value } })}><option value="">Any category</option>{data.categories.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</AdminSelect>
                  </div>}
                  {carouselForm.destination_type === 'custom_url' && <Field label="Custom URL or same-site path" className="md:col-span-2"><input className={inputClass} value={carouselForm.destination.custom_url} onChange={(event) => setCarouselForm({ ...carouselForm, destination: { ...carouselForm.destination, custom_url: event.target.value } })} placeholder="/about or https://example.com" required /></Field>}
                  <div className="flex gap-2 md:col-span-2"><button className={primaryButton} disabled={busy}><Save size={15} /> {carouselForm.id ? 'Save slide' : 'Add slide'}</button>{carouselForm.id && <button type="button" className={secondaryButton} onClick={() => setCarouselForm(blankCarousel())}>Cancel</button>}</div>
                </form>
                <div className="space-y-2">{data.carousel.map((item, index) => <div key={item.id} className="flex items-center gap-3 rounded-xl border border-slate-800 p-3"><img src={item.image_url} onError={useFallbackImage} alt="" className="h-14 w-20 rounded bg-slate-950 object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.title}</p><p className="truncate text-xs text-slate-500">{item.subtitle || item.destination_type} · Order {item.sort_order}</p></div><button className={secondaryButton} onClick={() => setCarouselForm({ ...blankCarousel(), ...item, destination: { ...blankCarousel().destination, ...(item.destination || {}) } })}>Edit</button><button onClick={() => saveHomeItemOrder('home/carousel', item, -1)} disabled={index === 0} className="rounded p-1 text-slate-500 disabled:opacity-30" aria-label="Move carousel up"><ArrowUp size={15} /></button><button onClick={() => saveHomeItemOrder('home/carousel', item, 1)} disabled={index === data.carousel.length - 1} className="rounded p-1 text-slate-500 disabled:opacity-30" aria-label="Move carousel down"><ArrowDown size={15} /></button><button onClick={() => remove(`/api/home/carousel/${item.id}`, 'Hapus slide carousel ini?')} className="rounded p-2 text-red-300 hover:bg-red-950" aria-label="Delete carousel slide"><Trash2 size={16} /></button></div>)}{!data.carousel.length && <EmptyState>Belum ada slide carousel.</EmptyState>}</div>
              </section>
              <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div><h2 className="font-semibold">Hot Brands</h2><p className="mt-1 text-xs text-slate-500">Brand pilihan Home, sesuai urutan yang ditetapkan.</p></div>
                <form onSubmit={async (event) => { event.preventDefault(); const ok = await save('/api/hot-brands', 'POST', hotForm, 'Hot Brand ditambahkan.'); if (ok) setHotForm(blankHotBrand()); }} className="grid gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3 sm:grid-cols-2">
                  <AdminSelect value={hotForm.brand_id} onChange={(event) => setHotForm({ ...hotForm, brand_id: event.target.value })} required><option value="">Select brand</option>{data.brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</AdminSelect><div><input className={inputClass} type="url" placeholder="Logo URL (optional)" value={hotForm.logo_url || ''} onChange={(event) => setHotForm({ ...hotForm, logo_url: event.target.value })} /><input className="mt-2 block w-full text-xs text-slate-400" type="file" accept=".jpg,.jpeg,.png,.webp,.svg,image/jpeg,image/png,image/webp,image/svg+xml" onChange={(event) => uploadImage(event.target.files?.[0], (url) => setHotForm((current) => ({ ...current, logo_url: url })))} />{hotForm.logo_url && <img src={hotForm.logo_url} onError={useFallbackImage} alt="Hot Brand logo preview" className="mt-2 h-12 w-20 rounded bg-slate-900 object-contain p-1" />}</div><input className={inputClass} type="number" placeholder="Order" value={hotForm.sort_order} onChange={(event) => setHotForm({ ...hotForm, sort_order: Number(event.target.value) })} /><button className={primaryButton} disabled={busy}><Plus size={15} /> Add</button>
                </form>
                {data.hotBrands.map((item, index) => {
                  const updateLocal = (field, value) => setData((current) => ({ ...current, hotBrands: current.hotBrands.map((row) => row.id === item.id ? { ...row, [field]: value } : row) }));
                  const imagePosition = `${item.logo_position_x ?? 50}% ${item.logo_position_y ?? 50}%`;
                  const imageTransform = `translate(${(item.logo_position_x ?? 50) - 50}%, ${(item.logo_position_y ?? 50) - 50}%) scale(${(item.logo_scale ?? 100) / 100})`;
                  return <div key={item.id} className="grid gap-3 rounded-xl border border-slate-800 p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto_auto]">
                    <div className="flex h-10 w-12 items-center justify-center overflow-hidden rounded bg-slate-950"><img src={item.logo_url || (item.brandSlug ? `/brands/${item.brandSlug}.svg` : '/garageboy-logo.png')} onError={useFallbackImage} alt="" className="h-full w-full object-contain" style={{ objectFit: item.logo_fit || 'contain', objectPosition: imagePosition, transform: imageTransform }} /></div>
                    <div className="min-w-0"><p className="truncate text-sm font-medium">{item.brandLabel}</p><input aria-label="Logo URL" className={`${inputClass} mt-2`} value={item.logo_url || ''} placeholder="Logo URL" onChange={(event) => updateLocal('logo_url', event.target.value)} /><input aria-label="Upload Hot Brand logo" className="mt-2 block w-full text-[10px] text-slate-400" type="file" accept=".jpg,.jpeg,.png,.webp,.svg,image/jpeg,image/png,image/webp,image/svg+xml" onChange={(event) => uploadImage(event.target.files?.[0], (url) => updateLocal('logo_url', url))} />
                      <div className="mt-3 grid gap-2 sm:grid-cols-2"><Field label="Fit"><AdminSelect value={item.logo_fit || 'contain'} onChange={(event) => updateLocal('logo_fit', event.target.value)}><option value="contain">Contain</option><option value="cover">Cover</option></AdminSelect></Field><Field label={`Scale ${item.logo_scale ?? 100}%`}><input type="range" min="50" max="200" step="1" className="w-full accent-red-500" value={item.logo_scale ?? 100} onChange={(event) => updateLocal('logo_scale', Number(event.target.value))} /></Field><Field label={`Position X ${item.logo_position_x ?? 50}%`}><input type="range" min="0" max="100" step="1" className="w-full accent-red-500" value={item.logo_position_x ?? 50} onChange={(event) => updateLocal('logo_position_x', Number(event.target.value))} /></Field><Field label={`Position Y ${item.logo_position_y ?? 50}%`}><input type="range" min="0" max="100" step="1" className="w-full accent-red-500" value={item.logo_position_y ?? 50} onChange={(event) => updateLocal('logo_position_y', Number(event.target.value))} /></Field></div>
                    </div>
                    <Toggle label="Live" checked={item.published} onChange={(value) => updateLocal('published', value)} />
                    <button onClick={() => save(`/api/hot-brands/${item.id}`, 'PUT', hotBrandInputBody(item), 'Hot Brand diperbarui.')} className="rounded p-2 text-slate-400 hover:text-white" aria-label="Save Hot Brand"><Save size={16} /></button>
                    <button onClick={() => save(`/api/hot-brands/${item.id}`, 'PUT', hotBrandInputBody(item, { logo_fit: 'contain', logo_scale: 100, logo_position_x: 50, logo_position_y: 50 }), 'Adjustment logo direset.')} className="rounded px-2 text-xs text-slate-400 hover:text-white" aria-label="Reset logo adjustment">Reset</button>
                    <div className="flex items-center gap-1"><button onClick={() => saveHomeItemOrder('hot-brands', item, -1)} disabled={index === 0} className="rounded p-1 text-slate-500 disabled:opacity-30" aria-label="Move up"><ArrowUp size={15} /></button><button onClick={() => saveHomeItemOrder('hot-brands', item, 1)} disabled={index === data.hotBrands.length - 1} className="rounded p-1 text-slate-500 disabled:opacity-30" aria-label="Move down"><ArrowDown size={15} /></button><button onClick={() => remove(`/api/hot-brands/${item.id}`, 'Hapus brand ini dari Hot Brands?')} className="rounded p-2 text-red-300 hover:bg-red-950" aria-label="Remove Hot Brand"><Trash2 size={16} /></button></div>
                  </div>;
                })}
                {!data.hotBrands.length && <EmptyState>Belum ada Hot Brand yang dipilih.</EmptyState>}
              </section>

              <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div><h2 className="font-semibold">Latest Modifications</h2><p className="mt-1 text-xs text-slate-500">Memilih produk existing; tidak membuat duplikasi katalog.</p></div>
                <form onSubmit={async (event) => { event.preventDefault(); const ok = await save('/api/latest-modifications', 'POST', latestForm, 'Produk ditambahkan ke Latest Modifications.'); if (ok) setLatestForm(blankLatest()); }} className="grid gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <AdminSelect value={latestForm.product_id} onChange={(event) => setLatestForm({ ...latestForm, product_id: event.target.value })} required><option value="">Select product</option>{data.products.filter((product) => !data.latest.some((item) => item.product_id === product.id)).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</AdminSelect><input className={inputClass} placeholder="Custom title (optional)" value={latestForm.title_override} onChange={(event) => setLatestForm({ ...latestForm, title_override: event.target.value })} /><input className={inputClass} type="url" placeholder="Custom image URL (optional)" value={latestForm.image_url_override} onChange={(event) => setLatestForm({ ...latestForm, image_url_override: event.target.value })} /><input className="block w-full text-xs text-slate-400" type="file" accept=".jpg,.jpeg,.png,.webp,.svg,image/jpeg,image/png,image/webp,image/svg+xml" onChange={(event) => uploadImage(event.target.files?.[0], (url) => setLatestForm((current) => ({ ...current, image_url_override: url })))} />{latestForm.image_url_override && <img src={latestForm.image_url_override} onError={useFallbackImage} alt="Latest image preview" className="h-20 w-full rounded bg-slate-900 object-cover" />}<div className="grid grid-cols-[1fr_auto] gap-2"><input className={inputClass} type="number" placeholder="Order" value={latestForm.sort_order} onChange={(event) => setLatestForm({ ...latestForm, sort_order: Number(event.target.value) })} /><button className={primaryButton} disabled={busy}><Plus size={15} /> Add</button></div>
                </form>
                {data.latest.map((item, index) => <div key={item.id} className="flex items-center gap-2 rounded-xl border border-slate-800 p-3"><img src={productImageSrc(item.image_url_override || item.product?.img)} onError={useFallbackImage} alt="" className="h-12 w-14 rounded bg-slate-950 object-cover" /><div className="min-w-0 flex-1 space-y-1"><AdminSelect aria-label="Selected product" value={item.product_id} onChange={(event) => setData({ ...data, latest: data.latest.map((row) => { if (row.id !== item.id) return row; const product = data.products.find((candidate) => candidate.id === event.target.value); return { ...row, product_id: event.target.value, product: product ? { ...product, name: row.title_override || product.name, img: row.image_url_override || product.img } : row.product }; }) })}><option value={item.product_id}>{item.product?.name}</option>{data.products.filter((product) => product.id !== item.product_id && !data.latest.some((other) => other.id !== item.id && other.product_id === product.id)).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</AdminSelect><input aria-label="Custom title" className={inputClass} placeholder="Custom title" value={item.title_override || ''} onChange={(event) => setData({ ...data, latest: data.latest.map((row) => row.id === item.id ? { ...row, title_override: event.target.value } : row) })} /><input aria-label="Custom image URL" className={inputClass} type="url" placeholder="Custom image URL" value={item.image_url_override || ''} onChange={(event) => setData({ ...data, latest: data.latest.map((row) => row.id === item.id ? { ...row, image_url_override: event.target.value } : row) })} /><input aria-label="Upload custom image" className="block w-full text-[10px] text-slate-400" type="file" accept=".jpg,.jpeg,.png,.webp,.svg,image/jpeg,image/png,image/webp,image/svg+xml" onChange={(event) => uploadImage(event.target.files?.[0], (url) => setData((current) => ({ ...current, latest: current.latest.map((row) => row.id === item.id ? { ...row, image_url_override: url } : row) })))} /></div><button onClick={() => save(`/api/latest-modifications/${item.id}`, 'PUT', { product_id: item.product_id, title_override: item.title_override || null, image_url_override: item.image_url_override || null, sort_order: item.sort_order }, 'Pilihan Latest Modifications disimpan.')} className="rounded p-2 text-slate-400 hover:text-white" aria-label="Save latest item"><Save size={16} /></button><button onClick={() => saveHomeItemOrder('latest-modifications', item, -1)} disabled={index === 0} className="rounded p-1 text-slate-500 disabled:opacity-30" aria-label="Move up"><ArrowUp size={15} /></button><button onClick={() => saveHomeItemOrder('latest-modifications', item, 1)} disabled={index === data.latest.length - 1} className="rounded p-1 text-slate-500 disabled:opacity-30" aria-label="Move down"><ArrowDown size={15} /></button><button onClick={() => remove(`/api/latest-modifications/${item.id}`, 'Hapus produk ini dari Latest Modifications? Produk katalog akan tetap ada.')} className="rounded p-2 text-red-300 hover:bg-red-950" aria-label="Remove latest item"><Trash2 size={16} /></button></div>)}
                {!data.latest.length && <EmptyState>Belum ada produk yang dipilih.</EmptyState>}
              </section>
            </div>
          )}
          {busy && <div role="status" className="text-center text-xs text-slate-500">Memuat atau menyimpan data…</div>}
        </div>
      </main>
    </div>
  );
}

function ShieldIcon() {
  return <span className="text-lg font-bold">GB</span>;
}

export default Admin;
