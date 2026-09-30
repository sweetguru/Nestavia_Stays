import { useEffect, useState } from "react";
import { api, errMsg } from "@/lib/api";
import { toast } from "sonner";

export const ListingEditor = () => {
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get("/property").then((r) => setF({ description: r.data.description, amenities: r.data.amenities.join("\n"), house_rules: r.data.house_rules.join("\n") })); }, []);
  const save = async () => {
    setBusy(true);
    try {
      await api.put("/host/listing", { description: f.description, amenities: f.amenities.split("\n"), house_rules: f.house_rules.split("\n") });
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
      <button data-testid="save-listing-btn" disabled={busy} onClick={save} className="btn-emerald px-5 py-2.5 mt-4 text-xs disabled:opacity-50">{busy ? "Saving…" : "Save listing"}</button>
    </div>
  );
};
const inp = "mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm font-normal text-[#1A1D1A] bg-white";
