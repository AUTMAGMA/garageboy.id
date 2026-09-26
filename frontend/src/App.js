import React, { useState, useMemo } from 'react';
import './App.css';
import Header from './components/Header';
import Carousel from './components/Carousel';
import SectionHeader from './components/SectionHeader';
import HotBrands from './components/HotBrands';
import ProductCard from './components/ProductCard';
import Catalog from './components/Catalog';
import ProductModal from './components/ProductModal';
import Footer from './components/Footer';
import Admin from './components/Admin'; // <-- Import Admin di sini
import { PRODUCTS as initialProducts, FEATURED } from './catalogData';

const DEFAULT_FILTERS = { brand: 'all', series: 'all', model: 'all', mod: 'all' };

function App() {
  // Cek apakah URL berakhiran #admin, jika ya tampilkan halaman Admin
  if (window.location.hash === '#admin') {
    return <Admin />;
  }

  const [view, setView] = useState('home'); // 'home' | 'catalog' | 'search'
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selected, setSelected] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState(null);

  // Menggabungkan produk lokal dari localStorage dengan data awal catalogData.js
  const PRODUCTS = useMemo(() => {
    const customProducts = JSON.parse(localStorage.getItem('garageboy_products')) || [];
    return [...customProducts, ...initialProducts];
  }, []);

  const popular = useMemo(() => {
    const ids = ['mustang-1522', 'camaro-1623', 'challenger', 'bmw-3', 'benz-g', 'honda', 'corvette-c8', 'escalade-2124'];
    return ids.map((cid) => PRODUCTS.find((p) => p.series === cid && p.mod === 'bodykit')).filter(Boolean);
  }, [PRODUCTS]);

  const showHome = () => {
    setView('home');
    setSearchResults(null);
    setSearchTerm('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openCatalog = (brand) => {
    setFilters({ ...DEFAULT_FILTERS, brand: brand || 'all' });
    setSearchResults(null);
    setView('catalog');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openFromCarousel = (c) => {
    const brand = (PRODUCTS.find((p) => p.series === c.id) || {}).brand || 'all';
    setFilters({ ...DEFAULT_FILTERS, brand, series: c.title });
    setSearchResults(null);
    setView('catalog');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onSearch = () => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return;
    const res = PRODUCTS.filter((p) =>
      `${p.name} ${p.desc} ${p.seriesLabel || ''} ${p.modelLabel || ''} ${p.brand}`.toLowerCase().includes(q));
    setSearchResults(res);
    setView('search');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Header onLogoClick={showHome} searchTerm={searchTerm} setSearchTerm={setSearchTerm} onSearch={onSearch} />

      {view === 'home' && (
        <div key="home">
          <div className="fade-up"><Carousel items={FEATURED} onOpen={openFromCarousel} /></div>

          <SectionHeader>Hot Brands</SectionHeader>
          <div className="fade-up"><HotBrands onOpenBrand={openCatalog} /></div>

          <SectionHeader>Latest Modifications</SectionHeader>
          <div className="fade-up mx-auto mb-16 grid w-[90%] max-w-[1280px] grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {popular.map((p) => <ProductCard key={p.id} product={p} onClick={setSelected} />)}
          </div>
        </div>
      )}

      {view === 'catalog' && (
        <div key="catalog" className="fade-up">
          <Catalog filters={filters} setFilter={setFilters} onOpen={setSelected} />
        </div>
      )}

      {view === 'search' && (
        <div key="search" className="fade-up mx-auto my-8 w-[90%] max-w-[1280px]">
          <p className="mb-4 text-[14px] text-[#aaa]">
            Search results for “{searchTerm}” — {(searchResults || []).length} products
          </p>
          {(searchResults || []).length === 0 ? (
            <div className="py-12 text-center text-[16px] text-[#888]">No products found</div>
          ) : (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {searchResults.map((p) => <ProductCard key={p.id} product={p} onClick={setSelected} />)}
            </div>
          )}
        </div>
      )}

      <Footer />

      {selected && <ProductModal product={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

export default App;