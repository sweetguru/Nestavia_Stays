import { useEffect, useState } from "react";
import { api, inr, fmtDate, errMsg, waLink } from "@/lib/api";
import { Stars } from "@/components/Reviews";
import { MapPin, Lock, ExternalLink, MessageCircle, FileDown } from "lucide-react";
import { toast } from "sonner";

const downloadReceipt = async (id) => {
  try {
    const r = await api.get(`/bookings/${id}/receipt.pdf`, { responseType: "blob" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(r.data); a.download = `nestavia-receipt-${id.slice(0, 8)}.pdf`; a.click(); URL.revokeObjectURL(a.href);
  } catch (e) { toast.error(errMsg(e)); }
};

const STATUS = { pending: "bg-amber-100 text-amber-800", confirmed: "bg-green-100 text-green-800", completed: "bg-[#0F281E] text-[#E6C687]", cancelled: "bg-gray-200 text-gray-700", rejected: "bg-red-100 text-red-700" };

export default function MyBookings() {
  const [items, setItems] = useState(null);
  const load = () => api.get("/bookings/my").then((r) => setItems(r.data.bookings));
  useEffect(() => { load(); }, []);

  const cancel = async (id) => {
    if (!window.confirm("Cancel this booking? Refund follows the cancellation policy.")) return;
    try { const r = await api.post(`/bookings/${id}/cancel`); toast.success(`Cancelled. Refund: ${inr(r.data.refund_amount)} (${r.data.refund_percent}%)`); load(); } catch (e) { toast.error(errMsg(e)); }
  };

  if (!items) return <div className="p-16 text-center text-[#5A655D]">Loading your trips…</div>;
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-8 py-12">
      <p className="eyebrow">Your trips</p>
      <h1 className="font-serif text-4xl sm:text-5xl font-bold text-[#0F281E] mt-2">My Bookings</h1>
      {items.length === 0 && <p data-testid="no-bookings" className="text-[#5A655D] mt-8">No bookings yet. Head back to the listing to reserve your dates.</p>}
      <div className="space-y-6 mt-10">
        {items.map((b) => <BookingCard key={b.id} b={b} onCancel={cancel} onReviewed={load} />)}
      </div>
    </main>
  );
}

const BookingCard = ({ b, onCancel, onReviewed }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const review = async () => {
    try { await api.post("/reviews", { booking_id: b.id, rating, comment }); toast.success("Thank you for your review!"); onReviewed(); } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <article data-testid={`booking-card-${b.id}`} className="card-lux p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-serif text-2xl text-[#0F281E]">{fmtDate(b.check_in)} → {fmtDate(b.check_out)}</div>
          <div className="text-sm text-[#5A655D] mt-1">{b.num_nights} night{b.num_nights > 1 ? "s" : ""} · {b.guests} guest{b.guests > 1 ? "s" : ""} · Ref {b.transaction_ref}</div>
        </div>
        <span data-testid={`booking-status-${b.id}`} className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${STATUS[b.status]}`}>{b.status}</span>
      </div>
      <div className="grid sm:grid-cols-3 gap-4 mt-6 text-sm">
        <Stat label="Total" value={inr(b.total)} /><Stat label={`Paid (${b.payment_option === "partial" ? "70%" : "100%"})`} value={inr(b.amount_due)} /><Stat label="Balance at check-in" value={inr(b.balance_due)} />
      </div>
      {b.status === "confirmed" || b.status === "completed" ? (
        <div data-testid={`booking-address-${b.id}`} className="mt-6 rounded-xl bg-[#0F281E] text-white p-5">
          <div className="flex items-center gap-2 text-[#E6C687] font-semibold"><MapPin size={16} /> Your exact location</div>
          <p className="text-sm mt-2">{b.address}</p>
          <div className="flex flex-wrap gap-3 mt-4">
            <a data-testid={`maps-link-${b.id}`} href={b.maps_link} target="_blank" rel="noreferrer" className="btn-gold px-4 py-2 text-xs inline-flex items-center gap-1.5"><ExternalLink size={14} /> Open in Google Maps</a>
            <a href={waLink("918802757866", `Hi Dr. Gurpreet, this is ${b.guest_name}. My booking (${fmtDate(b.check_in)} → ${fmtDate(b.check_out)}) is confirmed — could you share check-in instructions?`)} target="_blank" rel="noreferrer" className="px-4 py-2 text-xs rounded-full border border-white/30 inline-flex items-center gap-1.5 hover:bg-white/10"><MessageCircle size={14} /> WhatsApp host</a>
          </div>
        </div>
      ) : b.status === "pending" ? (
        <div data-testid={`booking-address-locked-${b.id}`} className="mt-6 rounded-xl bg-[#F0F4F1] p-5 text-sm text-[#3D5A45] flex items-center gap-3"><Lock size={16} className="text-[#C5A059]" /> Exact address & map unlock once the host verifies your payment.</div>
      ) : null}
      {(b.status === "pending" || b.status === "confirmed") && <button data-testid={`cancel-booking-btn-${b.id}`} onClick={() => onCancel(b.id)} className="mt-5 mr-4 text-xs text-red-600 hover:underline">Cancel booking</button>}
      <button data-testid={`download-receipt-btn-${b.id}`} onClick={() => downloadReceipt(b.id)} className="mt-5 inline-flex items-center gap-1.5 text-xs text-[#0F281E] font-semibold hover:underline"><FileDown size={14} /> Download PDF receipt</button>
      {b.status === "completed" && !b.reviewed && (
        <div data-testid={`review-form-${b.id}`} className="mt-6 border-t border-[#E8E2D2] pt-5">
          <p className="font-semibold text-[#0F281E] text-sm">How was your stay?</p>
          <div className="mt-2"><Stars n={rating} size={24} onPick={setRating} tid="review-stars" /></div>
          <textarea data-testid="review-comment-input" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="Share your experience…" className="w-full mt-3 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          <button data-testid="submit-review-btn" onClick={review} disabled={!comment.trim()} className="btn-emerald px-6 py-2.5 mt-3 text-sm disabled:opacity-50">Submit review</button>
        </div>
      )}
      {b.reviewed && <p className="mt-4 text-xs text-green-700 font-semibold">✓ You reviewed this stay</p>}
    </article>
  );
};
const Stat = ({ label, value }) => <div className="rounded-lg bg-[#F8F6F0] p-3"><div className="text-xs text-[#5A655D]">{label}</div><div className="font-semibold text-[#0F281E]">{value}</div></div>;
