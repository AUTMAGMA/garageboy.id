import React from 'react';
import { Instagram, Music2, MapPin } from 'lucide-react';

const LINKS = {
  instagram: 'https://www.instagram.com/garageboy.id/',
  tiktok: 'https://www.tiktok.com/@garageboy.id',
  maps: 'https://maps.app.goo.gl/Drmwi8Yt12UBzwEx7',
};

const MAP_EMBED =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d5112.58024672786!2d106.61925087600824!3d-6.247536993740846!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e69f9004e24e117%3A0x77d646dfc76314f8!2sGarage%20boy!5e1!3m2!1sen!2sid!4v1789192745483!5m2!1sen!2sid';

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black">
      <div className="mx-auto max-w-[1280px] px-[5%] py-12">
        <div className="grid gap-10 md:grid-cols-2">
          {/* Brand */}
          <div className="fade-up">
            <img src="/garageboy-logo-trans.png" alt="Garage Boy" className="h-16 w-auto object-contain" />
            <p className="mt-4 text-sm leading-relaxed text-white/50">
              Direct Source. Proper Parts. Reasonable Price.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-white/40">
              Automotive Parts · Bodykits · Conversion Parts · Part Hunting · Import · Distribution
            </p>
          </div>

          {/* Find Us */}
          <div className="fade-up d1">
            <h4 className="mb-4 text-sm font-semibold text-white">Find Us</h4>

            <div className="flex flex-wrap items-center gap-5">
              <a href={LINKS.instagram} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-white/80 transition-colors hover:text-[#E31837]">
                <Instagram className="h-4 w-4 shrink-0 text-[#E31837]" /> Instagram
              </a>
              <a href={LINKS.tiktok} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-white/80 transition-colors hover:text-[#E31837]">
                <Music2 className="h-4 w-4 shrink-0 text-[#E31837]" /> TikTok
              </a>
            </div>

            {/* Google Maps - dark, small, static */}
            <div className="mt-5 w-full max-w-[380px] overflow-hidden rounded-xl border border-white/10">
              <div className="relative aspect-[16/8] overflow-hidden bg-black">
                <iframe
                  title="Garage Boy Location"
                  src={MAP_EMBED}
                  className="pointer-events-none absolute inset-0 h-full w-full border-0"
                  style={{ filter: 'invert(0.92) hue-rotate(180deg) grayscale(0.35) contrast(0.95)' }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <a href={LINKS.maps} target="_blank" rel="noopener noreferrer"
                className="flex h-10 items-center justify-center gap-2 border-t border-white/10 bg-zinc-950 text-xs font-medium text-white/60 transition-colors hover:text-[#E31837]">
                <MapPin className="h-4 w-4" /> View on Google Maps
              </a>
            </div>

            <p className="mt-4 flex items-center gap-2 text-xs text-white/40">
              <MapPin className="h-4 w-4 shrink-0" /> Gading Serpong, Indonesia
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row">
          <p>© {new Date().getFullYear()} Garageboy.id. All Rights Reserved.</p>
          <p>Making Indonesian modification more proper, accessible &amp; reasonable.</p>
        </div>
      </div>
    </footer>
  );
}
