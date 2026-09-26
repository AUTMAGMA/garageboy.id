import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { asset } from '../lib/asset';

export default function Carousel({ items, onOpen }) {
  const visible = 4;
  const maxIndex = Math.max(0, items.length - visible);
  const [index, setIndex] = useState(0);
  const timer = useRef(null);

  const next = () => setIndex((i) => (i < maxIndex ? i + 1 : 0));
  const prev = () => setIndex((i) => (i > 0 ? i - 1 : maxIndex));

  useEffect(() => {
    timer.current = setInterval(next, 4000);
    return () => clearInterval(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxIndex]);

  return (
    <section className="relative flex items-center bg-[#050505] px-[5%] py-8">
      <button onClick={prev} aria-label="Previous"
        className="absolute left-[2%] z-10 rounded bg-black/60 px-3 py-3 text-white transition-colors hover:bg-[#E31837]">
        <ChevronLeft size={24} />
      </button>

      <div className="mx-auto w-[90%] overflow-hidden">
        <div className="flex gap-[15px] transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${index * 25}%)` }}>
          {items.map((c) => (
            <div key={c.id} onClick={() => onOpen(c)}
              className="group relative flex h-[200px] min-w-[calc(25%-12px)] cursor-pointer flex-col overflow-hidden rounded border border-[#222] bg-[#0d0d0d]">
              <div className="relative flex-1 overflow-hidden">
                <img src={asset(c.img)} alt={c.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                {/* hover overlay: brand logo + car type & spec */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-[#1e3a6b]/80 px-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <img src={asset('/garageboy-logo-trans.png')} alt="GARAGE BOY" className="h-[52px] w-auto object-contain drop-shadow" />
                  <span className="h-6 w-px bg-white/70" />
                  <div className="text-center">
                    <div className="text-[15px] font-bold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]">{c.title}</div>
                    {c.sub && <div className="mt-0.5 text-[12px] text-white/85">{c.sub}</div>}
                    <div className="mt-1 text-[10px] uppercase tracking-wider text-[#ff9db0]">Full Body Kit</div>
                  </div>
                </div>
              </div>
              <div className="bg-black py-2 text-center">
                <div className="text-[14px] font-bold text-white">{c.title}</div>
                {c.sub && <div className="text-[11px] text-[#aaa]">{c.sub}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={next} aria-label="Next"
        className="absolute right-[2%] z-10 rounded bg-black/60 px-3 py-3 text-white transition-colors hover:bg-[#E31837]">
        <ChevronRight size={24} />
      </button>
    </section>
  );
}
