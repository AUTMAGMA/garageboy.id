import React, { useState, useMemo, useEffect } from 'react';
import './App.css';

import Header from './components/Header';
import Carousel from './components/Carousel';
import SectionHeader from './components/SectionHeader';
import HotBrands from './components/HotBrands';
import ProductCard from './components/ProductCard';
import Catalog from './components/Catalog';
import ProductModal from './components/ProductModal';
import Footer from './components/Footer';
import Admin from './components/Admin';

import { PRODUCTS as initialProducts } from './catalogData';
import { fetchProducts, fetchHotBrands, fetchLatestModifications, fetchHomeCarousel } from './lib/productsApi';
import { filtersFromCarouselDestination, matchesCatalogFilters, productMatchesSearch } from './lib/catalogFilters';
import { applyPageSeo, getPageSeo } from './lib/seo';
import {
  brandPath,
  catalogPathFromFilters,
  parseSeoRoute,
  productPath,
} from './lib/seoRoutes';

const DEFAULT_FILTERS = {
  brand: 'all',
  series: 'all',
  model: 'all',
  mod: 'all'
};

function readSavedProducts() {
  try {
    const savedProducts = JSON.parse(localStorage.getItem('garageboy_products') || '[]');
    return Array.isArray(savedProducts) ? savedProducts : [];
  } catch (error) {
    console.error('Gagal membaca garageboy_products dari localStorage:', error);
    return [];
  }
}

function searchProducts(products, query, filters = DEFAULT_FILTERS) {
  return products.filter((product) => (
    matchesCatalogFilters(product, filters) && productMatchesSearch(product, query)
  ));
}

function App() {
  /*
   * ============================================================
   * ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURN
   * ============================================================
   */

  const [view, setView] = useState('home');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selected, setSelected] = useState(null);
  const [route, setRoute] = useState(() => parseSeoRoute(window.location));
  const [productReturnPath, setProductReturnPath] = useState('/');
  const [productReturnView, setProductReturnView] = useState('home');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [fallbackProducts] = useState(() => [...readSavedProducts(), ...initialProducts]);
  const [products, setProducts] = useState(fallbackProducts);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState(null);
  const [hotBrands, setHotBrands] = useState([]);
  const [latestProducts, setLatestProducts] = useState([]);
  const [carouselItems, setCarouselItems] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    fetchProducts(controller.signal)
      .then((apiProducts) => {
        setProducts(apiProducts);
        setProductsError(null);
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setProducts(fallbackProducts);
        setProductsError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setProductsLoading(false);
      });

    return () => controller.abort();
  }, [fallbackProducts]);

  useEffect(() => {
    const controller = new AbortController();
    fetchHotBrands(controller.signal).then(setHotBrands).catch(() => setHotBrands([]));
    fetchLatestModifications(controller.signal).then(setLatestProducts).catch(() => setLatestProducts([]));
    fetchHomeCarousel(controller.signal).then((items) => setCarouselItems(items.map((item) => ({
      ...item,
      img: item.image_url,
      sub: item.subtitle || '',
    })))).catch(() => setCarouselItems([]));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const syncRoute = () => setRoute(parseSeoRoute(window.location));
    window.addEventListener('popstate', syncRoute);
    window.addEventListener('hashchange', syncRoute);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('hashchange', syncRoute);
    };
  }, []);

  useEffect(() => {
    const routePath = `${window.location.pathname}${window.location.search}`;
    applyPageSeo(getPageSeo(route, products, productsLoading, routePath));
  }, [route, products, productsLoading]);

  useEffect(() => {
    if (route.type === 'admin') return;
    setSearchResults(null);
    setSelected(null);

    if (route.type === 'home') {
      setView('home');
      setFilters(DEFAULT_FILTERS);
      setSearchTerm('');
      return;
    }
    if (route.type === 'product') {
      setView(productReturnView || 'home');
      const product = products.find((row) => String(row.id) === String(route.id));
      if (product) setSelected(product);
      return;
    }
    if (route.type === 'search') {
      const query = route.query || '';
      setView('search');
      const searchFilters = { ...DEFAULT_FILTERS, ...route.filters };
      setFilters(searchFilters);
      setSearchTerm(query);
      setSearchResults(searchProducts(products, query, searchFilters));
      return;
    }
    if (route.type === 'catalog') {
      setView('catalog');
      setFilters({ ...DEFAULT_FILTERS, ...route.filters });
      return;
    }
    if (route.type === 'brand') {
      setView('catalog');
      setFilters({ ...DEFAULT_FILTERS, brand: route.id });
      return;
    }
    if (route.type === 'category') {
      setView('catalog');
      setFilters({ ...DEFAULT_FILTERS, mod: route.id });
      return;
    }
    if (route.type === 'vehicleModel' || route.type === 'vehicleGeneration') {
      const product = products.find((row) => String(row.vehicle_model_id) === String(route.modelId)
        && (route.type !== 'vehicleGeneration' || String(row.vehicle_generation_id) === String(route.generationId)));
      setView('catalog');
      setFilters({
        ...DEFAULT_FILTERS,
        brand: product?.brand_id || 'all',
        series: route.modelId,
        model: route.type === 'vehicleGeneration' ? route.generationId : 'all',
      });
      return;
    }
    setView('home');
  }, [route, products, productsLoading, productReturnView]);

  useEffect(() => {
    if (view === 'search' && searchTerm.trim()) {
      setSearchResults(searchProducts(products, searchTerm, filters));
    }
  }, [products, searchTerm, filters, view]);

  const popular = useMemo(() => latestProducts, [latestProducts]);

  /*
   * ============================================================
   * ADMIN CHECK
   * ============================================================
   *
   * IMPORTANT:
   * Ini sengaja diletakkan SETELAH semua Hooks.
   */
  if (window.location.hash === '#admin') {
    return <Admin />;
  }

  /*
   * ============================================================
   * HOME
   * ============================================================
   */

  const navigateTo = (path, replace = false) => {
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (current !== path) {
      const method = replace ? 'replaceState' : 'pushState';
      window.history[method]({}, '', path);
    }
    setRoute(parseSeoRoute(window.location));
  };

  const showHome = () => {
    navigateTo('/');
    setView('home');
    setFilters(DEFAULT_FILTERS);
    setSearchResults(null);
    setSearchTerm('');

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  /*
   * ============================================================
   * OPEN CATALOG
   * ============================================================
   */

  const openCatalog = (brand) => {
    const nextFilters = {
      ...DEFAULT_FILTERS,
      brand: brand || 'all'
    };
    navigateTo(catalogPathFromFilters(nextFilters, products));
    setFilters(nextFilters);

    setSearchResults(null);
    setView('catalog');

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  /*
   * ============================================================
   * OPEN PRODUCT FROM CAROUSEL
   * ============================================================
   */

  const openFromCarousel = (c) => {
    if (c.destination_type === 'custom_url' && c.destination?.custom_url) {
      window.location.assign(c.destination.custom_url);
      return;
    }
    const nextFilters = filtersFromCarouselDestination(c);
    navigateTo(catalogPathFromFilters(nextFilters, products));
    setFilters(nextFilters);

    setSearchResults(null);
    setView('catalog');

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  /*
   * ============================================================
   * SEARCH
   * ============================================================
   */

  const onSearch = () => {
    const q = searchTerm.trim().toLowerCase();

    if (!q) {
      return;
    }

    const res = searchProducts(products, q, filters);

    setSearchResults(res);
    setView('search');
    const params = new URLSearchParams({ q: searchTerm.trim() });
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all') params.set(key, value);
    });
    navigateTo(`/search?${params.toString()}`);

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const openProduct = (product) => {
    setProductReturnPath(`${window.location.pathname}${window.location.search}` || '/');
    setProductReturnView(view);
    setSelected(product);
    navigateTo(productPath(product));
  };

  const closeProduct = () => {
    setSelected(null);
    navigateTo(productReturnPath || '/');
  };

  const setCatalogFilter = (nextFilters) => {
    navigateTo(catalogPathFromFilters(nextFilters, products));
    setFilters(nextFilters);
    setSearchResults(null);
    setView('catalog');
  };

  const getBrandHref = (brandId) => {
    const product = products.find((row) => String(row.brand_id) === String(brandId));
    return product ? brandPath({ id: brandId, name: product.brandLabel, slug: product.brandSlug }) : '/catalog';
  };

  const getCarouselHref = (item) => {
    if (item.destination_type === 'custom_url' && item.destination?.custom_url) return item.destination.custom_url;
    return catalogPathFromFilters(filtersFromCarouselDestination(item), products);
  };

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="min-h-screen bg-[#050505] text-white">

      <Header
        onLogoClick={showHome}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onSearch={onSearch}
      />

      {/* ======================================================
          HOME
          ====================================================== */}

      {view === 'home' && (
        <div key="home">

          <div className="fade-up">
            <Carousel
              items={carouselItems}
              onOpen={openFromCarousel}
              getHref={getCarouselHref}
            />
          </div>

          <SectionHeader>
            Hot Brands
          </SectionHeader>

          <div className="fade-up">
            <HotBrands
              onOpenBrand={openCatalog}
              getBrandHref={getBrandHref}
              brands={hotBrands}
            />
          </div>

          <SectionHeader>
            Latest Modifications
          </SectionHeader>

          {productsError && (
            <p role="status" className="mx-auto mb-4 w-[90%] max-w-[1280px] text-sm text-white/50">
              Product API is unavailable. Showing the saved catalog when available.
            </p>
          )}

          <div className="fade-up mx-auto mb-16 grid w-[90%] max-w-[1280px] grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">

            {popular.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onClick={openProduct}
              />
            ))}

            {popular.length === 0 && productsLoading && (
              <p role="status" className="col-span-full py-6 text-center text-sm text-white/50">Loading products…</p>
            )}
            {popular.length === 0 && !productsLoading && productsError && (
              <p role="alert" className="col-span-full py-6 text-center text-sm text-white/50">Product catalog could not be loaded.</p>
            )}

          </div>

        </div>
      )}

      {/* ======================================================
          CATALOG
          ====================================================== */}

      {view === 'catalog' && (
        <div
          key="catalog"
          className="fade-up"
        >
          <Catalog
            filters={filters}
            setFilter={setCatalogFilter}
            onOpen={openProduct}
            products={products}
            loading={productsLoading}
            error={productsError}
            searchTerm={searchTerm}
          />
        </div>
      )}

      {/* ======================================================
          SEARCH
          ====================================================== */}

      {view === 'search' && (
        <div
          key="search"
          className="fade-up mx-auto my-8 w-[90%] max-w-[1280px]"
        >

          <p className="mb-4 text-[14px] text-[#aaa]">
            Search results for “{searchTerm}” —{' '}
            {(searchResults || []).length} products
          </p>

          {(searchResults || []).length === 0 && productsLoading ? (
            <div role="status" className="py-12 text-center text-[16px] text-[#888]">
              Loading products…
            </div>
          ) : (searchResults || []).length === 0 && productsError ? (
            <div role="alert" className="py-12 text-center text-[16px] text-[#888]">
              Product catalog could not be loaded.
            </div>
          ) : (searchResults || []).length === 0 ? (

            <div className="py-12 text-center text-[16px] text-[#888]">
              No products found
            </div>

          ) : (

            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">

              {searchResults.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onClick={openProduct}
                />
              ))}

            </div>

          )}

        </div>
      )}

      {/* ======================================================
          FOOTER
          ====================================================== */}

      <Footer />

      {/* ======================================================
          PRODUCT MODAL
          ====================================================== */}

      {selected && (
        <ProductModal
          product={selected}
          onClose={closeProduct}
        />
      )}

    </div>
  );
}

export default App;
