import React, { useState, useEffect } from 'react';

function Admin() {
  const [products, setProducts] = useState([]);
  
  // State untuk Brand & Modifikasi
  const [brands, setBrands] = useState([
    { key: 'bmw', label: 'BMW' },
    { key: 'benz', label: 'Mercedes-Benz' },
    { key: 'audi', label: 'Audi' },
    { key: 'ford', label: 'Ford' },
  ]);

  const [mods, setMods] = useState([
    { key: 'bodykit', label: 'Full Body Kit' },
    { key: 'front', label: 'Front Bumper' },
    { key: 'rear', label: 'Rear Diffuser' },
    { key: 'grille', label: 'Front Grille' },
  ]);

  const [form, setForm] = useState({
    name: '',
    brand: 'bmw',
    mod: 'bodykit',
    series: 'bmw-3',
    seriesLabel: '3 Series',
    modelLabel: 'F30',
    desc: '',
    coverType: 'url',
    coverUrl: '',
    coverFile: '',
    partType: 'url',
    partUrl: '',
    partFile: ''
  });

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('garageboy_products')) || [];
    setProducts(saved);
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileConvert = (e, targetField) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, [targetField]: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddBrand = () => {
    const brandName = prompt('Masukkan nama brand baru (contoh: Porsche):');
    if (brandName) {
      const key = brandName.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!brands.some(b => b.key === key)) {
        setBrands([...brands, { key, label: brandName }]);
        setForm({ ...form, brand: key });
      }
    }
  };

  const handleAddMod = () => {
    const modName = prompt('Masukkan kategori modifikasi baru (contoh: Spoiler):');
    if (modName) {
      const key = modName.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!mods.some(m => m.key === key)) {
        setMods([...mods, { key, label: modName }]);
        setForm({ ...form, mod: key });
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalCover = form.coverType === 'url' ? form.coverUrl : form.coverFile;
    const finalPart = form.partType === 'url' ? form.partUrl : form.partFile;

    if (!form.name || !finalCover) {
      alert('Nama produk dan Gambar Cover Utama wajib diisi!');
      return;
    }

    const newProduct = {
      id: 'custom-' + Date.now(),
      name: form.name,
      brand: form.brand, // Pastikan key string seperti 'bmw', 'benz', dll
      series: form.series || 'custom-series',
      seriesLabel: form.seriesLabel || 'Series',
      modelLabel: form.modelLabel || 'Standard',
      mod: form.mod, // Pastikan key string seperti 'bodykit', 'front', dll
      modLabel: mods.find(m => m.key === form.mod)?.label || 'Full Body Kit',
      desc: form.desc || `${form.modelLabel || ''} · GARAGE BOY`,
      img: finalCover,
      sheets: finalPart ? [finalPart] : []
    };

    const updated = [newProduct, ...products];
    setProducts(updated);
    localStorage.setItem('garageboy_products', JSON.stringify(updated));

    alert('Produk berhasil disimpan dan diterbitkan!');
    setForm({
      name: '',
      brand: 'bmw',
      mod: 'bodykit',
      series: 'bmw-3',
      seriesLabel: '3 Series',
      modelLabel: 'F30',
      desc: '',
      coverType: 'url',
      coverUrl: '',
      coverFile: '',
      partType: 'url',
      partUrl: '',
      partFile: ''
    });
  };

  const handleDelete = (id) => {
    if (window.confirm('Yakin ingin menghapus produk ini?')) {
      const filtered = products.filter(p => p.id !== id);
      setProducts(filtered);
      localStorage.setItem('garageboy_products', JSON.stringify(filtered));
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b border-[#222] pb-4">
          <h1 className="text-2xl font-bold tracking-wider text-red-600">GARAGE BOY // ADMIN PANEL</h1>
          <a href="/" className="text-xs bg-[#222] hover:bg-[#333] px-4 py-2 rounded transition">Kembali ke Website</a>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#111] border border-[#222] p-6 rounded-lg space-y-6 mb-10 shadow-xl">
          <h2 className="text-lg font-semibold border-b border-[#222] pb-2">Tambah Produk Baru</h2>

          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Nama Produk</label>
            <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Contoh: BMW 3 Series Full Body Kit" className="w-full bg-[#1a1a1a] border border-[#333] p-2.5 rounded text-sm text-white focus:border-red-600 outline-none" required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs uppercase tracking-wider text-gray-400">Brand Mobil</label>
                <button type="button" onClick={handleAddBrand} className="text-xs text-red-500 hover:underline">+ Tambah Brand</button>
              </div>
              <select name="brand" value={form.brand} onChange={handleChange} className="w-full bg-[#1a1a1a] border border-[#333] p-2.5 rounded text-sm text-white outline-none">
                {brands.map(b => (
                  <option key={b.key} value={b.key}>{b.label}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs uppercase tracking-wider text-gray-400">Kategori Modifikasi</label>
                <button type="button" onClick={handleAddMod} className="text-xs text-red-500 hover:underline">+ Tambah Kategori</button>
              </div>
              <select name="mod" value={form.mod} onChange={handleChange} className="w-full bg-[#1a1a1a] border border-[#333] p-2.5 rounded text-sm text-white outline-none">
                {mods.map(m => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Series ID</label>
              <input type="text" name="series" value={form.series} onChange={handleChange} placeholder="cth: bmw-3" className="w-full bg-[#1a1a1a] border border-[#333] p-2.5 rounded text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Label Series</label>
              <input type="text" name="seriesLabel" value={form.seriesLabel} onChange={handleChange} placeholder="cth: 3 Series" className="w-full bg-[#1a1a1a] border border-[#333] p-2.5 rounded text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Model / Tahun</label>
              <input type="text" name="modelLabel" value={form.modelLabel} onChange={handleChange} placeholder="cth: F30" className="w-full bg-[#1a1a1a] border border-[#333] p-2.5 rounded text-sm text-white" />
            </div>
          </div>

          {/* Gambar Cover Utama */}
          <div className="border border-[#222] p-4 rounded bg-[#161616]">
            <label className="block text-xs uppercase tracking-wider text-red-500 font-bold mb-2">1. Gambar Cover Utama (URL / Link Gambar)</label>
            <div className="flex gap-6 mb-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="coverType" value="url" checked={form.coverType === 'url'} onChange={handleChange} /> Link URL
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="coverType" value="upload" checked={form.coverType === 'upload'} onChange={handleChange} /> Upload File
              </label>
            </div>
            {form.coverType === 'url' ? (
              <input type="url" name="coverUrl" value={form.coverUrl} onChange={handleChange} placeholder="https://images.unsplash.com/..." className="w-full bg-[#1a1a1a] border border-[#333] p-2.5 rounded text-sm text-white" />
            ) : (
              <input type="file" accept="image/*" onChange={(e) => handleFileConvert(e, 'coverFile')} className="w-full text-xs text-gray-400 file:py-1 file:px-3 file:rounded file:border-0 file:bg-red-600 file:text-white cursor-pointer" />
            )}
          </div>

          {/* Gambar Detail Part */}
          <div className="border border-[#222] p-4 rounded bg-[#161616]">
            <label className="block text-xs uppercase tracking-wider text-red-500 font-bold mb-2">2. Gambar Detail Part (Opsional)</label>
            <div className="flex gap-6 mb-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="partType" value="url" checked={form.partType === 'url'} onChange={handleChange} /> Link URL
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="partType" value="upload" checked={form.partType === 'upload'} onChange={handleChange} /> Upload File
              </label>
            </div>
            {form.partType === 'url' ? (
              <input type="url" name="partUrl" value={form.partUrl} onChange={handleChange} placeholder="https://images.unsplash.com/..." className="w-full bg-[#1a1a1a] border border-[#333] p-2.5 rounded text-sm text-white" />
            ) : (
              <input type="file" accept="image/*" onChange={(e) => handleFileConvert(e, 'partFile')} className="w-full text-xs text-gray-400 file:py-1 file:px-3 file:rounded file:border-0 file:bg-red-600 file:text-white cursor-pointer" />
            )}
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Deskripsi Singkat</label>
            <input type="text" name="desc" value={form.desc} onChange={handleChange} placeholder="F30 · GARAGE BOY Full Body Kit" className="w-full bg-[#1a1a1a] border border-[#333] p-2.5 rounded text-sm text-white" />
          </div>

          <button type="submit" className="w-full bg-red-600 hover:bg-red-700 font-bold py-3 rounded text-sm transition tracking-wider uppercase mt-4">
            Simpan & Terbitkan Produk
          </button>
        </form>

        {/* List Produk */}
        <h2 className="text-lg font-semibold mb-4">Kelola Produk Tersimpan ({products.length})</h2>
        <div className="space-y-3">
          {products.length === 0 ? (
            <p className="text-sm text-gray-500 italic py-4">Belum ada produk custom.</p>
          ) : (
            products.map((item) => (
              <div key={item.id} className="bg-[#111] border border-[#222] p-4 rounded-lg flex items-center gap-4">
                <img src={item.img} alt="Cover" className="w-14 h-14 object-cover rounded bg-[#222]" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{item.name}</h3>
                  <p className="text-xs text-red-500 uppercase">Brand: {item.brand} | Mod: {item.modLabel}</p>
                </div>
                <button onClick={() => handleDelete(item.id)} className="bg-red-950/60 hover:bg-red-600 text-red-400 hover:text-white px-3 py-1.5 rounded text-xs transition">
                  Hapus
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Admin;