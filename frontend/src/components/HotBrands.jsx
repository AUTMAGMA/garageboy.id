import React from 'react';
import { BRANDS } from '../catalogData';
import { asset } from '../lib/asset';

export default function HotBrands({ onOpenBrand }) {
  const brands = BRANDS.filter((b) => b.key !== 'all');

  return (
    <div className="mx-auto w-[90%] max-w-[1280px] rounded bg-white px-5 py-9">
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 text-center sm:grid-cols-3 md:grid-cols-5">
        {brands.map((b) => (
          <div
            key={b.key}
            onClick={() => onOpenBrand(b.key)}
            className="group flex cursor-pointer flex-col items-center justify-center"
          >
            <div className="mx-auto mb-2 flex h-[50px] w-[90px] items-center justify-center transition-transform duration-200 group-hover:-translate-y-1">
              <img
                src={asset(`/brands/${b.key}.svg`)}
                alt={b.label}
                className="max-h-full max-w-full object-contain opacity-80 transition-opacity group-hover:opacity-100"
              />
            </div>
            <p className="mt-1 text-[12px] font-medium text-[#555] group-hover:text-[#E31837]">
              US-{b.label.split(' / ')[0]}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
