import { Star, BadgeCheck } from "lucide-react";

export const Stars = ({ n, size = 16, onPick, tid }) => (
  <div className="flex gap-0.5" data-testid={tid}>
    {[1, 2, 3, 4, 5].map((i) => (
      <button key={i} type="button" disabled={!onPick} onClick={() => onPick?.(i)} data-testid={onPick ? `star-${i}` : undefined} className={onPick ? "hover:scale-110 transition-transform" : "cursor-default"}>
        <Star size={size} className={i <= n ? "fill-[#C5A059] text-[#C5A059]" : "text-[#D6D1C4]"} />
      </button>
    ))}
  </div>
);

export const Reviews = ({ data }) => (
  <section data-testid="reviews-section" className="mt-16">
    <p className="eyebrow">Verified guest reviews</p>
    <div className="flex items-center gap-4 mt-2">
      <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#0F281E]">{data.count ? `${data.average} · ${data.count} review${data.count > 1 ? "s" : ""}` : "Be our first reviewer"}</h2>
      {data.count > 0 && <Stars n={Math.round(data.average)} size={20} tid="reviews-average-stars" />}
    </div>
    {data.count === 0 && <p className="text-[#5A655D] mt-3 text-sm">Reviews are only accepted from guests who completed a verified stay.</p>}
    <div className="grid sm:grid-cols-2 gap-5 mt-8">
      {data.reviews.map((r) => (
        <article key={r.id} data-testid={`review-card-${r.id}`} className="card-lux p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#0F281E] text-[#E6C687] font-serif text-lg flex items-center justify-center">{r.guest_name?.[0] || "G"}</div>
              <div><div className="font-semibold text-sm">{r.guest_name}</div><div className="text-xs text-[#5A655D]">{new Date(r.created_at).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</div></div>
            </div>
            <span className="flex items-center gap-1 text-[11px] text-green-700 font-semibold"><BadgeCheck size={14} /> Verified stay</span>
          </div>
          <Stars n={r.rating} />
          <p className="text-sm text-[#1A1D1A] mt-3 leading-relaxed">{r.comment}</p>
        </article>
      ))}
    </div>
  </section>
);
