import { INSTA_QR, LOGO } from "@/lib/assets";
import { Instagram, Clapperboard } from "lucide-react";

const HANDLE = "Nestavia_stays";

export const InstagramGallery = ({ posts = [] }) => (
  <section data-testid="instagram-section" className="mt-16">
    <p className="eyebrow">Latest on Instagram</p>
    <div className="flex flex-wrap items-center justify-between gap-4 mt-2">
      <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#0F281E]">@{HANDLE}</h2>
      <div className="flex gap-2">
        <a data-testid="insta-posts-link" href={`https://www.instagram.com/${HANDLE}/`} target="_blank" rel="noreferrer" className="btn-emerald px-4 py-2 text-xs inline-flex items-center gap-1.5"><Instagram size={14} /> View posts</a>
        <a data-testid="insta-reels-link" href={`https://www.instagram.com/${HANDLE}/reels/`} target="_blank" rel="noreferrer" className="btn-gold px-4 py-2 text-xs inline-flex items-center gap-1.5"><Clapperboard size={14} /> Watch reels</a>
      </div>
    </div>
    <div className="grid sm:grid-cols-3 gap-5 mt-8">
      <a data-testid="insta-profile-card" href={`https://www.instagram.com/${HANDLE}/`} target="_blank" rel="noreferrer" className="card-lux p-6 flex flex-col items-center text-center hover:-translate-y-1 transition-transform">
        <img src={LOGO} alt="Nestavia on Instagram" className="h-20 w-20 rounded-full ring-2 ring-[#C5A059]" />
        <div className="font-semibold text-[#0F281E] mt-3">@{HANDLE}</div>
        <p className="text-xs text-[#5A655D] mt-1">Stay photos, guest stories & Himalayan getaway ideas</p>
        <img src={INSTA_QR} alt="Instagram QR" className="h-28 w-28 mt-4 object-contain" />
      </a>
      {posts.length === 0 ? (
        <div data-testid="insta-empty" className="sm:col-span-2 card-lux p-6 flex items-center justify-center text-sm text-[#5A655D] text-center">Follow us on Instagram for the latest posts and reels from Nestavia.</div>
      ) : posts.slice(0, 6).map((u) => (
        <div key={u} data-testid="insta-embed" className="card-lux overflow-hidden aspect-[4/5]">
          <iframe title={u} src={`${u.replace(/\/?(\?.*)?$/, "")}/embed`} className="w-full h-full" loading="lazy" allowTransparency="true" frameBorder="0" scrolling="no" />
        </div>
      ))}
    </div>
  </section>
);
