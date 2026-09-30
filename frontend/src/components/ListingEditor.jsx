import { useEffect, useState } from "react";
import { api, errMsg } from "@/lib/api";
import { toast } from "sonner";

export const ListingEditor = () => {
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get("/property").then((r) => setF({ description: r.data.description, amenities: r.data.amenities.join("\n"), house_rules: r.data.house_rules.join("\n"), instagram_posts: (r.data.instagram_posts || []).join("\n"), promo_enabled: !!r.data.promo_enabled, promo_title: r.data.promo_title || "", promo_text: r.data.promo_text || "" })); }, []);
  const save = async () => {
    setBusy(true);
    try {
      await api.put("/host/listing", { ...f, amenities: f.amenities.split("\n"), house_rules: f.house_rules.split("\n"), instagram_posts: f.instagram_posts.split("\n") });
      toast.success("Listing updated — changes are live");
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  if (!f) return null;
  return (
    <div data-testid="listing-editor" className="card-lux p-6">
      <h3 className="font-serif text-2xl text-[#0F281E]">Edit listing</h3>
      <p className="text-xs text-[#5A655D] mt-1">One amenity / rule per line.</p>
      <label className="block mt-4 text-xs font-semibold text-[#3D5A45]">Description
        <textarea data-testid="listing-description-input" rows={5} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className={inp} />
      </label>
      <label className="block mt-3 text-xs font-semibold text-[#3D5A45]">Amenities
        <textarea data-testid="listing-amenities-input" rows={5} value={f.amenities} onChange={(e) => setF({ ...f, amenities: e.target.value })} className={inp} />
      </label>
      <label className="block mt-3 text-xs font-semibold text-[#3D5A45]">House rules
        <textarea data-testid="listing-rules-input" rows={4} value={f.house_rules} onChange={(e) => setF({ ...f, house_rules: e.target.value })} className={inp} />
      </label>
      <label className="block mt-3 text-xs font-semibold text-[#3D5A45]">Instagram post / reel links (shown on home page)
        <textarea data-testid="listing-instagram-input" rows={3} placeholder={"https://www.instagram.com/p/XXXX/\nhttps://www.instagram.com/reel/XXXX/"} value={f.instagram_posts} onChange={(e) => setF({ ...f, instagram_posts: e.target.value })} className={inp} />
      </label>
      <div className="mt-5 rounded-xl border border-[#E6C687] bg-[#FBF8EE] p-4">
        <label className="flex items-center justify-between text-xs font-semibold text-[#0F281E]">Special offer banner
          <input data-testid="promo-enabled-toggle" type="checkbox" checked={f.promo_enabled} onChange={(e) => setF({ ...f, promo_enabled: e.target.checked })} className="h-4 w-4 accent-[#C5A059]" />
        </label>
        <input data-testid="promo-title-input" placeholder="Title, e.g. Diwali Special — 20% off" value={f.promo_title} onChange={(e) => setF({ ...f, promo_title: e.target.value })} className={inp} />
        <input data-testid="promo-text-input" placeholder="Details, e.g. Valid for stays 1–15 Nov. Mention DIWALI on WhatsApp." value={f.promo_text} onChange={(e) => setF({ ...f, promo_text: e.target.value })} className={inp} />
      </div>
      <button data-testid="save-listing-btn" disabled={busy} onClick={save} className="btn-emerald px-5 py-2.5 mt-4 text-xs disabled:opacity-50">{busy ? "Saving…" : "Save listing"}</button>
    </div>
  );
};
const inp = "mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm font-normal text-[#1A1D1A] bg-white";
