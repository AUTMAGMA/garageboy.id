import React from 'react';
import { Search } from 'lucide-react';

export default function Header({ onLogoClick, searchTerm, setSearchTerm, onSearch }) {
  const submit = (e) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <header className="sticky top-0 z-[100] flex items-center justify-between gap-4 border-b border-[#222] bg-black px-[5%] py-3">
      {/* Logo */}
      <div className="flex cursor-pointer items-center gap-3 shrink-0" onClick={onLogoClick}>
        <img src="./garageboy-logo.png" alt="GARAGE BOY" className="h-[46px] w-auto object-contain" />
        <div className="hidden leading-tight sm:block fade-up">
          <h1 className="m-0 text-[16px] font-bold tracking-[1px] text-white">garageboy.id</h1>
          <p className="m-0 text-[10px] tracking-[1px] text-[#888]">AUTO BODY KIT CATALOG</p>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={submit} className="hidden w-[40%] max-w-[480px] items-center md:flex">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search model... e.g. Mustang, G Class, Civic"
          className="flex-1 border border-[#333] bg-[#111] px-3.5 py-2.5 text-[13px] text-white outline-none focus:border-[#E31837]"
        />
        <button
          type="submit"
          className="flex items-center gap-1.5 border-none bg-[#E31837] px-5 py-2.5 font-bold text-white transition-colors hover:bg-[#c01530]"
        >
          <Search size={15} /> Search
        </button>
      </form>

      <div className="flex items-center gap-4 shrink-0">
        <button className="h-[30px] w-[30px] rounded-full border-none bg-[#E31837] text-[12px] font-bold text-white transition-transform hover:scale-110">
          EN
        </button>
      </div>
    </header>
  );
}
