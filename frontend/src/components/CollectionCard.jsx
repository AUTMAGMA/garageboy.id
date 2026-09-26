import React from 'react';
import { Layers } from 'lucide-react';
import { productImageSrc, useFallbackImage } from '../lib/productImage';

export default function CollectionCard({ item, onClick }) {
  return (
    <div onClick={() => onClick(item)}
      className="group cursor-pointer overflow-hidden rounded border border-[#222] bg-[#111] transition-colors hover:border-[#E31837]">
      <div className="h-[180px] overflow-hidden bg-white">
        <img src={productImageSrc(item.thumb)} alt={item.title} onError={useFallbackImage}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
      </div>
      <div className="px-3 py-3 text-center">
        <h4 className="text-[14px] font-semibold text-[#eee]">{item.title}</h4>
        {item.sub && <p className="mt-0.5 text-[12px] text-[#888]">{item.sub}</p>}
        <p className="mt-1.5 flex items-center justify-center gap-1 text-[11px] text-[#E31837]">
          <Layers size={12} /> {item.count} catalog {item.count > 1 ? 'sheets' : 'sheet'}
        </p>
      </div>
    </div>
  );
}
