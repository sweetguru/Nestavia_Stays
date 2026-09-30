import { useState } from "react";
import { GALLERY } from "@/lib/assets";
import { Images, X, ChevronLeft, ChevronRight } from "lucide-react";

export const HeroGallery = () => {
  const [open, setOpen] = useState(null);
  const step = (d) => setOpen((i) => (i + d + GALLERY.length) % GALLERY.length);
  return (
    <>
      <div className="relative grid grid-cols-4 grid-rows-2 gap-2 sm:gap-3 h-[320px] sm:h-[460px] lg:h-[540px] rounded-2xl overflow-hidden rise">
        {GALLERY.map((g, i) => (
          <button key={g.url} data-testid={`gallery-photo-${i}`} onClick={() => setOpen(i)}
            className={`relative group overflow-hidden ${i === 0 ? "col-span-4 sm:col-span-2 row-span-2" : "hidden sm:block"}`}>
            <img src={g.url} alt={g.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-[#0F281E]/0 group-hover:bg-[#0F281E]/20 transition-colors" />
          </button>
        ))}
        <button data-testid="gallery-view-all-btn" onClick={() => setOpen(0)} className="absolute bottom-4 right-4 flex items-center gap-2 bg-white/95 text-[#0F281E] text-sm font-semibold px-4 py-2 rounded-full shadow-lg hover:bg-white">
          <Images size={16} /> View all {GALLERY.length} photos
        </button>
      </div>
      {open !== null && (
        <div data-testid="gallery-lightbox" className="fixed inset-0 z-[60] bg-[#0F281E]/95 flex items-center justify-center p-4" onClick={() => setOpen(null)}>
          <button data-testid="lightbox-close-btn" className="absolute top-5 right-5 text-white p-2" onClick={() => setOpen(null)}><X /></button>
          <button className="absolute left-4 text-white p-3 hidden sm:block" onClick={(e) => { e.stopPropagation(); step(-1); }}><ChevronLeft size={32} /></button>
          <img src={GALLERY[open].url} alt={GALLERY[open].title} className="max-h-[85vh] max-w-full rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
          <button className="absolute right-4 text-white p-3 hidden sm:block" onClick={(e) => { e.stopPropagation(); step(1); }}><ChevronRight size={32} /></button>
          <p className="absolute bottom-6 text-[#E6C687] font-serif text-xl">{GALLERY[open].title} · {open + 1}/{GALLERY.length}</p>
        </div>
      )}
    </>
  );
};
