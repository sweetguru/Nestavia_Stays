import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, inr, errMsg } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PaymentModal } from "@/components/PaymentModal";
import { toast } from "sonner";

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (s, n) => { const d = new Date(`${s}T00:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

export const BookingWidget = ({ property }) => {
  const { user, isHost } = useAuth();
  const nav = useNavigate();
  const [checkIn, setCheckIn] = useState(addDays(today(), 7));
  const [checkOut, setCheckOut] = useState(addDays(today(), 9));
  const [guests, setGuests] = useState(2);
  const [payOpt, setPayOpt] = useState("partial");
  const [quote, setQuote] = useState(null);
  const [err, setErr] = useState("");
  const [pay, setPay] = useState(false);

  useEffect(() => {
    if (!checkIn || !checkOut) return;
    api.post("/pricing/quote", { check_in: checkIn, check_out: checkOut, guests, payment_option: payOpt })
      .then((r) => { setQuote(r.data); setErr(""); if (!r.data.partial_allowed) setPayOpt("full"); })
      .catch((e) => { setQuote(null); setErr(errMsg(e)); });
  }, [checkIn, checkOut, guests, payOpt]);

  const reserve = () => {
    if (!user) { toast.info("Please log in to reserve"); return nav("/auth?next=/"); }
    if (isHost) return toast.error("Host account cannot make bookings");
    setPay(true);
  };

  return (
    <aside data-testid="booking-widget" className="card-lux p-6 sm:p-8 lg:sticky lg:top-28">
      <div className="flex items-end justify-between">
        <div><span className="font-serif text-4xl font-semibold text-[#0F281E]">{inr(property.base_rate)}</span><span className="text-[#5A655D] text-sm"> / night</span></div>
        <span className="text-xs text-[#5A655D]">for 2 guests</span>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-6">
        <label className="text-xs font-semibold text-[#3D5A45]">Check-in
          <input data-testid="checkin-input" type="date" min={today()} value={checkIn} onChange={(e) => { setCheckIn(e.target.value); if (checkOut <= e.target.value) setCheckOut(addDays(e.target.value, 1)); }} className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#1A1D1A] bg-white" />
        </label>
        <label className="text-xs font-semibold text-[#3D5A45]">Check-out
          <input data-testid="checkout-input" type="date" min={addDays(checkIn, 1)} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#1A1D1A] bg-white" />
        </label>
      </div>
      <label className="block mt-3 text-xs font-semibold text-[#3D5A45]">Guests (max {property.max_guests})
        <select data-testid="guests-select" value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm bg-white">
          {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} guest{n > 1 ? "s" : ""}{n > 2 ? ` (+${inr(property.extra_guest_fee * (n - 2))}/night)` : ""}</option>)}
        </select>
      </label>

      {err && <p data-testid="quote-error" className="mt-4 text-sm text-red-600">{err}</p>}

      {quote && (
        <div data-testid="quote-breakdown" className="mt-6 space-y-2 text-sm text-[#1A1D1A]">
          <Row label={`${inr(quote.base_rate)} × ${quote.num_nights} night${quote.num_nights > 1 ? "s" : ""}`} value={inr(quote.room_subtotal)} tid="quote-room-subtotal" />
          {quote.weekend_markup_total > 0 && <Row label="Weekend markup (Fri/Sat +15%)" value={`+${inr(quote.weekend_markup_total)}`} tid="quote-weekend" />}
          {quote.extra_guest_total > 0 && <Row label={`Extra guest fee (${quote.extra_guests} × ₹500/night)`} value={`+${inr(quote.extra_guest_total)}`} tid="quote-extra-guest" />}
          {quote.is_last_minute && <Row label="Last-minute discount (10%)" value={`−${inr(quote.last_minute_discount)}`} tid="quote-last-minute" green />}
          <div className="border-t border-[#E8E2D2] pt-3 flex justify-between font-semibold text-base"><span>Total</span><span data-testid="quote-total">{inr(quote.total)}</span></div>

          <div className="mt-4 rounded-xl bg-[#F0F4F1] p-4">
            <p className="eyebrow !text-[10px] mb-2">Payment plan</p>
            {quote.partial_allowed ? (
              <div className="flex gap-2">
                <Opt tid="pay-option-partial" active={payOpt === "partial"} onClick={() => setPayOpt("partial")} title={`${quote.partial_percent}% now`} sub="Balance at check-in" />
                <Opt tid="pay-option-full" active={payOpt === "full"} onClick={() => setPayOpt("full")} title="100% now" sub="Pay in full" />
              </div>
            ) : (
              <p data-testid="full-payment-required" className="text-xs text-[#3D5A45]">Check-in is within 6 days — full payment required.</p>
            )}
            <div className="flex justify-between mt-3 text-sm"><span className="text-[#3D5A45]">Pay now</span><span data-testid="quote-amount-due" className="font-bold text-[#0F281E]">{inr(quote.amount_due)}</span></div>
            {quote.balance_due > 0 && <div className="flex justify-between text-xs text-[#5A655D]"><span>Balance at check-in</span><span data-testid="quote-balance-due">{inr(quote.balance_due)}</span></div>}
          </div>
        </div>
      )}

      <button data-testid="reserve-btn" disabled={!quote} onClick={reserve} className="btn-gold w-full py-3.5 mt-6 disabled:opacity-50">Reserve via GPay / UPI</button>
      <p className="text-center text-xs text-[#5A655D] mt-3">You won't be charged automatically — pay manually & upload receipt.</p>
      {pay && quote && <PaymentModal quote={quote} property={property} onClose={() => setPay(false)} />}
    </aside>
  );
};

const Row = ({ label, value, tid, green }) => (
  <div className="flex justify-between"><span className="text-[#5A655D]">{label}</span><span data-testid={tid} className={green ? "text-green-700 font-medium" : ""}>{value}</span></div>
);
const Opt = ({ tid, active, onClick, title, sub }) => (
  <button data-testid={tid} onClick={onClick} className={`flex-1 rounded-lg border p-3 text-left transition-colors ${active ? "border-[#C5A059] bg-white" : "border-transparent bg-white/60 hover:bg-white"}`}>
    <div className="text-sm font-semibold text-[#0F281E]">{title}</div><div className="text-[11px] text-[#5A655D]">{sub}</div>
  </button>
);
