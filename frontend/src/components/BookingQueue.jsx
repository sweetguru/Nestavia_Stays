import { useState } from "react";
import { api, inr, fmtDate, errMsg, waLink } from "@/lib/api";
import { MessageCircle, Receipt, Check, X, Flag } from "lucide-react";
import { toast } from "sonner";

const ADDRESS = "Unit No. 1001, 10th Floor, Maya Garden Magnesia Tower-1, PR-7 Airport road, ZIRAKPUR, PUNJAB 140603";
const MAPS = "https://maps.app.goo.gl/Qb1YFdH2ay7NKLwY6";
const phone = (p) => (p || "").replace(/\D/g, "").replace(/^(\d{10})$/, "91$1");

export const approvalMessage = (b) =>
  `Hello ${b.guest_name}! 🌿 Your booking at Nestavia Zirakpur - The Himalayan Gateway is CONFIRMED.\n\n📅 ${fmtDate(b.check_in)} → ${fmtDate(b.check_out)} · ${b.guests} guest(s)\n💰 Paid: ${inr(b.amount_due)}${b.balance_due > 0 ? ` · Balance at check-in: ${inr(b.balance_due)}` : ""}\n\n📍 Exact location: ${ADDRESS}\n🗺️ Map: ${MAPS}\n\n🕑 Check-in 2 PM · Check-out 11 AM. Please carry a government ID for every guest. Strict policy: no unregistered guests.\n\nSee you soon! — Gurpreet Kaur`;

const STATUS = { pending: "bg-amber-100 text-amber-800", confirmed: "bg-green-100 text-green-800", completed: "bg-[#0F281E] text-[#E6C687]", cancelled: "bg-gray-200 text-gray-700", rejected: "bg-red-100 text-red-700" };

export const BookingQueue = ({ bookings, reload, filter }) => {
  const list = bookings.filter((b) => (filter === "all" ? true : b.status === filter));
  const run = async (p, ok) => { try { await p; toast.success(ok); reload(); } catch (e) { toast.error(errMsg(e)); } };
  if (!list.length) return <p data-testid="queue-empty" className="text-sm text-[#5A655D] py-10 text-center">No {filter === "all" ? "" : filter} bookings.</p>;
  return (
    <div className="space-y-4">
      {list.map((b) => (
        <article key={b.id} data-testid={`host-booking-${b.id}`} className="card-lux p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-semibold text-[#0F281E]">{b.guest_name} <span className="text-[#5A655D] font-normal text-sm">· {b.guest_email} · {b.guest_phone}</span></div>
              <div className="text-sm mt-1">{fmtDate(b.check_in)} → {fmtDate(b.check_out)} · {b.num_nights}N · {b.guests} guests</div>
              <div className="text-xs text-[#5A655D] mt-1">UPI ref <span className="font-mono text-[#0F281E]">{b.transaction_ref}</span> · {b.payment_option === "partial" ? "70% down-payment" : "Full payment"} · Total {inr(b.total)} · <b>Paid {inr(b.amount_due)}</b></div>
              {b.special_requests && <div className="text-xs italic text-[#5A655D] mt-1">"{b.special_requests}"</div>}
            </div>
            <span data-testid={`host-booking-status-${b.id}`} className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS[b.status]}`}>{b.status}</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {b.receipt_file_id && <ReceiptBtn id={b.receipt_file_id} bid={b.id} />}
            {b.status === "pending" && <>
              <button data-testid={`approve-btn-${b.id}`} onClick={() => run(api.post(`/bookings/${b.id}/approve`), "Booking approved — send WhatsApp confirmation")} className="btn-emerald px-4 py-2 text-xs inline-flex items-center gap-1.5"><Check size={14} /> Approve</button>
              <button data-testid={`reject-btn-${b.id}`} onClick={() => run(api.post(`/bookings/${b.id}/reject`), "Booking rejected")} className="px-4 py-2 text-xs rounded-full border border-red-300 text-red-700 inline-flex items-center gap-1.5 hover:bg-red-50"><X size={14} /> Reject</button>
            </>}
            {b.status === "confirmed" && <>
              <a data-testid={`whatsapp-confirm-btn-${b.id}`} href={waLink(phone(b.guest_phone), approvalMessage(b))} target="_blank" rel="noreferrer" className="px-4 py-2 text-xs rounded-full bg-[#25D366] text-white inline-flex items-center gap-1.5 font-semibold"><MessageCircle size={14} /> Send WhatsApp confirmation</a>
              <button data-testid={`complete-btn-${b.id}`} onClick={() => run(api.post(`/bookings/${b.id}/complete`), "Marked as completed")} className="px-4 py-2 text-xs rounded-full border border-[#0F281E] text-[#0F281E] inline-flex items-center gap-1.5"><Flag size={14} /> Mark stay completed</button>
            </>}
          </div>
        </article>
      ))}
    </div>
  );
};

const ReceiptBtn = ({ id, bid }) => {
  const [src, setSrc] = useState(null);
  const open = async () => {
    if (src) return setSrc(null);
    try { const r = await api.get(`/files/${id}`, { responseType: "blob" }); setSrc(URL.createObjectURL(r.data)); } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <>
      <button data-testid={`view-receipt-btn-${bid}`} onClick={open} className="px-4 py-2 text-xs rounded-full bg-[#F0F4F1] text-[#0F281E] inline-flex items-center gap-1.5"><Receipt size={14} /> {src ? "Hide receipt" : "View receipt"}</button>
      {src && <img data-testid={`receipt-image-${bid}`} src={src} alt="Payment receipt" className="w-full max-w-xs rounded-xl border mt-2 basis-full" />}
    </>
  );
};
