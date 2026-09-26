import React from 'react';
import { asset } from '../lib/asset';

export default function HotBrands({ onOpenBrand, brands = [] }) {
  const useBrandLogoFallback = (event) => {
    const image = event.currentTarget;
    if (image.dataset.fallbackApplied !== 'true') {
      image.dataset.fallbackApplied = 'true';
      image.src = asset('/garageboy-logo.png');
      return;
    }
    image.style.visibility = 'hidden';
  };

  return (
    <div className="mx-auto w-[90%] max-w-[1280px] rounded bg-white px-5 py-9">
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 text-center sm:grid-cols-3 md:grid-cols-5">
        {brands.map((b) => (
          <div
            key={b.id}
            onClick={() => onOpenBrand(b.brand_id)}
            className="group flex cursor-pointer flex-col items-center justify-center"
          >
            <div
              className="mx-auto mb-2 flex h-[50px] w-[90px] items-center justify-center transition-transform duration-200 group-hover:-translate-y-1"
              style={{ overflow: b.logo_fit !== 'contain' || (b.logo_scale ?? 100) !== 100 || (b.logo_position_x ?? 50) !== 50 || (b.logo_position_y ?? 50) !== 50 ? 'hidden' : undefined }}
            >
              <img
                src={b.logo_url || (b.brandSlug ? asset(`/brands/${b.brandSlug}.svg`) : asset('/garageboy-logo.png'))}
                alt={b.brandLabel || 'Brand'}
                onError={useBrandLogoFallback}
                className="max-h-full max-w-full object-contain opacity-80 transition-opacity group-hover:opacity-100"
                style={{
                  objectFit: b.logo_fit || 'contain',
                  objectPosition: `${b.logo_position_x ?? 50}% ${b.logo_position_y ?? 50}%`,
                  transform: `translate(${(b.logo_position_x ?? 50) - 50}%, ${(b.logo_position_y ?? 50) - 50}%) scale(${(b.logo_scale ?? 100) / 100})`,
                  width: '100%',
                  height: '100%',
                }}
              />
            </div>
            <p className="mt-1 text-[12px] font-medium text-[#555] group-hover:text-[#E31837]">
              {b.brandLabel}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
