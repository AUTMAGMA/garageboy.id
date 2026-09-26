import React from 'react';

export default function SectionHeader({ children }) {
  return (
    <div className="fade-up mb-6 mt-12 text-center">
      <h2 className="relative inline-block text-[24px] font-normal text-white">
        {children}
        <span className="absolute -bottom-2 left-1/2 h-[2px] w-[35px] -translate-x-1/2 bg-[#E31837]" />
      </h2>
    </div>
  );
}
