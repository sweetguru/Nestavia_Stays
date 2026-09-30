import { useState } from "react";
import { api, errMsg } from "@/lib/api";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const iso = (d) => d.toISOString().slice(0, 10);

export const HostCalendar = ({ avail, reload }) => {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [sel, setSel] = useState([]);
  const [rate, setRate] = useState("");
  const blocked = new Set(avail.blocked), booked = new Set(avail.booked);
  const overrides = Object.fromEntries(avail.rate_overrides.map((o) => [o.date, o.rate]));

  const first = new Date(month); const pad = (first.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array(pad).fill(null), ...Array.from({ length: days }, (_, i) => iso(new Date(Date.UTC(month.getFullYear(), month.getMonth(), i + 1))))];

  const toggle = (d) => setSel((s) => (s.includes(d) ? s.filter((x) => x !== d) : [...s, d]));
  const act = async (fn, ok) => { try { await fn(); toast.success(ok); setSel([]); setRate(""); reload(); } catch (e) { toast.error(errMsg(e)); } };

  return (
    <div data-testid="host-calendar" className="card-lux p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-2xl text-[#0F281E]">Availability & rates</h3>
        <div className="flex items-center gap-2">
          <button data-testid="cal-prev-btn" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="p-1.5 rounded-full hover:bg-[#F0F4F1]"><ChevronLeft size={18} /></button>
          <span data-testid="cal-month-label" className="text-sm font-semibold w-36 text-center">{month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</span>
          <button data-testid="cal-next-btn" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="p-1.5 rounded-full hover:bg-[#F0F4F1]"><ChevronRight size={18} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 mt-5 text-center text-[11px] text-[#5A655D] font-semibold">{["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => <div key={d}>{d}</div>)}</div>
      <div className="grid grid-cols-7 gap-1 mt-1">
        {cells.map((d, i) => d === null ? <div key={i} /> : (
          <button key={d} data-testid={`cal-day-${d}`} onClick={() => !booked.has(d) && toggle(d)}
            className={`aspect-square rounded-lg text-xs flex flex-col items-center justify-center border transition-colors
              ${booked.has(d) ? "bg-[#0F281E] text-white border-[#0F281E] cursor-not-allowed" : blocked.has(d) ? "bg-red-50 text-red-700 border-red-200 line-through" : "bg-white border-[#E8E2D2] hover:border-[#C5A059]"}
              ${sel.includes(d) ? "ring-2 ring-[#C5A059]" : ""}`}>
            <span className="font-semibold">{Number(d.slice(8))}</span>
            {overrides[d] && <span className="text-[9px] text-[#B38C43]">₹{overrides[d]}</span>}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 mt-4 text-[11px] text-[#5A655D]"><L c="bg-[#0F281E]" t="Booked" /><L c="bg-red-100 border border-red-200" t="Blocked" /><L c="bg-white border border-[#C5A059]" t="Selected" /></div>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span data-testid="cal-selected-count" className="text-xs text-[#3D5A45] mr-2">{sel.length} date{sel.length !== 1 ? "s" : ""} selected</span>
        <button data-testid="cal-block-btn" disabled={!sel.length} onClick={() => act(() => api.post("/host/block", { dates: sel }), "Dates blocked")} className="px-4 py-2 rounded-full text-xs font-semibold bg-red-600 text-white disabled:opacity-40">Block</button>
        <button data-testid="cal-unblock-btn" disabled={!sel.length} onClick={() => act(() => api.post("/host/unblock", { dates: sel }), "Dates unblocked")} className="px-4 py-2 rounded-full text-xs font-semibold border border-[#0F281E] text-[#0F281E] disabled:opacity-40">Unblock</button>
        <input data-testid="cal-rate-input" type="number" placeholder="Override ₹/night" value={rate} onChange={(e) => setRate(e.target.value)} className="w-36 rounded-full border border-[#E2E8F0] px-3 py-2 text-xs" />
        <button data-testid="cal-set-rate-btn" disabled={!sel.length || !rate} onClick={() => act(() => Promise.all(sel.map((d) => api.post("/host/rate-override", { date: d, rate: Number(rate) }))), "Rates updated")} className="btn-gold px-4 py-2 text-xs disabled:opacity-40">Set rate</button>
        <button data-testid="cal-clear-rate-btn" disabled={!sel.length} onClick={() => act(() => Promise.all(sel.map((d) => api.delete(`/host/rate-override/${d}`))), "Overrides cleared")} className="px-4 py-2 rounded-full text-xs font-semibold text-[#3D5A45] hover:bg-[#F0F4F1] disabled:opacity-40">Reset rate</button>
      </div>
    </div>
  );
};
const L = ({ c, t }) => <span className="flex items-center gap-1.5"><span className={`h-3 w-3 rounded ${c}`} />{t}</span>;
