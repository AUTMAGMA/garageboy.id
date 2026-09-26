import React from 'react';
import { Link2 } from 'lucide-react';
import { asset } from '../lib/asset';

export default function ProductCard({ product, onClick }) {
  return (
    <div
      onClick={() => onClick(product)}
      className="group cursor-pointer overflow-hidden rounded border border-[#222] bg-[#111] text-center transition-colors hover:border-[#E31837]"
    >
      <div className="relative h-[190px] overflow-hidden bg-[#0d0d0d]">
        <img
          src={asset(product.img)}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* hover overlay: link icon */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E31837] text-white shadow-lg">
            <Link2 size={24} />
          </span>
        </div>
      </div>
      <div className="px-2.5 py-3">
        <h4 className="text-[13px] font-normal leading-snug text-[#ddd] transition-colors group-hover:text-[#E31837] group-hover:underline">
          {product.name}
        </h4>
      </div>
    </div>
  );
}
