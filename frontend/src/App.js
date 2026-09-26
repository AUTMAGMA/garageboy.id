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

  const showHome = () => {
    setView('home');
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
    setFilters({
      ...DEFAULT_FILTERS,
      brand: brand || 'all'
    });

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
    setFilters(filtersFromCarouselDestination(c));

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

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
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
            />
          </div>

          <SectionHeader>
            Hot Brands
          </SectionHeader>

          <div className="fade-up">
            <HotBrands
              onOpenBrand={openCatalog}
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
                onClick={setSelected}
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
            setFilter={setFilters}
            onOpen={setSelected}
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
                  onClick={setSelected}
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
          onClose={() => setSelected(null)}
        />
      )}

    </div>
  );
}

export default App;
